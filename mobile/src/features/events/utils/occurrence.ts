import { formatEventDateTimeInDeviceZone } from '../../../lib/dateTime';
import type { AppEvent } from '../../../lib/api/data';
import type { EventStatusChip, ScheduledEventOccurrence } from '../types';

const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;
const NEXT_24_HOURS_MS = 24 * 60 * 60 * 1000;

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
    return 'Live now';
  }

  if (status === 'waiting_room' || status === 'soon') {
    return 'Waiting room';
  }

  if (status === 'ended') {
    return 'Ended';
  }

  return 'Upcoming';
}
