import { formatEventDateTimeInDeviceZone } from '../../../lib/dateTime';
import type { AppEvent, EventLibraryItem, NewsDrivenEventItem } from '../../../lib/api/data';
import type { EventStatusChip, ScheduledEventOccurrence } from '../types';

const HORIZON_DAYS = 7;
const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;
const NEXT_24_HOURS_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_HOURS_UTC = [0, 3, 6, 9, 12, 15, 18, 21];

export function normalizeCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value && value.length > 0 ? value : 'Manifestation';
}

export function formatEventSubtitle(event: AppEvent) {
  const startsAtMillis = new Date(event.startsAt).getTime();
  if (!Number.isFinite(startsAtMillis)) {
    return event.subtitle?.trim() || 'Scheduled event';
  }

  const nowMillis = Date.now();
  const endsAtMillis = startsAtMillis + Math.max(1, event.durationMinutes) * 60 * 1000;
  if (nowMillis >= startsAtMillis && nowMillis < endsAtMillis) {
    return `${event.participants} active now`;
  }

  if (nowMillis >= endsAtMillis) {
    return 'Ended';
  }

  const hoursUntil = Math.max(0, Math.floor((startsAtMillis - nowMillis) / 3600000));
  if (hoursUntil < 1) {
    return 'Starting soon';
  }

  if (hoursUntil < 24) {
    return `Starts in ${hoursUntil}h`;
  }

  const days = Math.floor(hoursUntil / 24);
  return `Starts in ${days}d`;
}

export function toOccurrenceStatus(
  startIso: string,
  durationMinutes: number,
  nowMillis: number,
): EventStatusChip | null {
  const startMillis = new Date(startIso).getTime();
  if (!Number.isFinite(startMillis)) {
    return null;
  }

  const endMillis = startMillis + Math.max(1, durationMinutes) * 60 * 1000;
  if (nowMillis >= endMillis) {
    return null;
  }

  if (nowMillis >= startMillis && nowMillis < endMillis) {
    return 'live';
  }

  if (startMillis > nowMillis && startMillis - nowMillis <= SOON_WINDOW_MS) {
    return 'soon';
  }

  return 'upcoming';
}

export function formatOccurrenceStartLabel(startIso: string) {
  return (
    formatEventDateTimeInDeviceZone(startIso, {
      includeDate: true,
      includeTimeZone: true,
    }) ?? 'Upcoming'
  );
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addLocalDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildTemplateScheduleSlots(nowDate: Date) {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const lookbackMillis = 2 * 60 * 60 * 1000;
  const slots: Date[] = [];

  const startOfTodayUtc = new Date(
    Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), 0, 0, 0, 0),
  );

  for (let dayOffset = 0; dayOffset < HORIZON_DAYS; dayOffset += 1) {
    for (const hour of SCHEDULE_HOURS_UTC) {
      const startAt = new Date(startOfTodayUtc);
      startAt.setUTCDate(startOfTodayUtc.getUTCDate() + dayOffset);
      startAt.setUTCHours(hour, 0, 0, 0);

      if (startAt.getTime() < nowMillis - lookbackMillis) {
        continue;
      }

      if (startAt.getTime() > horizonMillis) {
        continue;
      }

      slots.push(startAt);
    }
  }

  return slots;
}

export function buildScheduledTemplateEvents(
  items: EventLibraryItem[],
  nowDate: Date,
): ScheduledEventOccurrence[] {
  const slots = buildTemplateScheduleSlots(nowDate);
  if (slots.length === 0 || items.length === 0) {
    return [];
  }

  const sortedItems = items.slice().sort((left, right) => left.title.localeCompare(right.title));
  const maxCount = Math.min(sortedItems.length, slots.length);
  const nowMillis = nowDate.getTime();
  const occurrences: ScheduledEventOccurrence[] = [];

  for (let index = 0; index < maxCount; index += 1) {
    const item = sortedItems[index];
    const slot = slots[index];
    const startsAt = (slot ?? new Date(nowDate.getTime() + index * 60 * 60 * 1000)).toISOString();
    const status = toOccurrenceStatus(startsAt, item?.durationMinutes ?? 10, nowMillis);
    if (!status) {
      continue;
    }

    occurrences.push({
      body: item?.body ?? '',
      category: normalizeCategory(item?.category),
      durationMinutes: item?.durationMinutes ?? 10,
      favoriteKey: item?.id ?? `template-${index}`,
      occurrenceKey: `template:${item?.id}:${startsAt}`,
      script: item?.script ?? item?.body ?? '',
      source: 'template',
      startsAt,
      startsCount: item?.startsCount ?? 0,
      status,
      title: item?.title ?? 'Manifestation Event',
    });
  }

  return occurrences;
}

export function buildScheduledNewsEvents(
  items: NewsDrivenEventItem[],
  nowDate: Date,
): ScheduledEventOccurrence[] {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const occurrences: ScheduledEventOccurrence[] = [];

  for (const item of items) {
    if (!item.countryCode && !item.locationHint) {
      continue;
    }

    const startMillis = new Date(item.startsAt).getTime();
    if (!Number.isFinite(startMillis)) {
      continue;
    }

    const endMillis = startMillis + item.durationMinutes * 60 * 1000;
    if (endMillis <= nowMillis || startMillis > horizonMillis) {
      continue;
    }

    const status = toOccurrenceStatus(item.startsAt, item.durationMinutes, nowMillis);
    if (!status) {
      continue;
    }

    occurrences.push({
      body: item.summary,
      category: `News - ${normalizeCategory(item.category)}`,
      countryCode: item.countryCode,
      durationMinutes: item.durationMinutes,
      favoriteKey: item.id,
      locationHint: item.locationHint,
      occurrenceKey: `news:${item.id}:${item.startsAt}`,
      script: item.script,
      source: 'news',
      startsAt: item.startsAt,
      startsCount: 0,
      status,
      title: item.title,
    });
  }

  return occurrences.sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

export function isWithinNext24Hours(startIso: string, durationMinutes: number, nowMillis: number) {
  const startMillis = new Date(startIso).getTime();
  if (!Number.isFinite(startMillis)) {
    return false;
  }

  const endMillis = startMillis + Math.max(1, durationMinutes) * 60 * 1000;
  const horizonMillis = nowMillis + NEXT_24_HOURS_MS;
  return endMillis > nowMillis && startMillis <= horizonMillis;
}

export function statusLabel(status: EventStatusChip) {
  if (status === 'live') {
    return 'Live';
  }

  if (status === 'soon') {
    return 'Soon';
  }

  return 'Upcoming';
}
