import type { CanonicalEventOccurrence } from '../../../lib/api/data';
import type {
  LiveOccurrenceState,
  LiveFeedSectionKey,
  OccurrenceSection,
  ScheduledEventOccurrence,
} from '../types';

const NEXT_24_HOURS_MS = 24 * 60 * 60 * 1000;
const WAITING_ROOM_WINDOW_MS = 20 * 60 * 1000;
const FLAGSHIP_SERIES_KEYS = new Set([
  'special-collective-moment',
  'global-peace-circle',
  'global-awakening-meditation',
  'heart-coherence-circle',
  'full-moon-gathering',
  'emergency-global-prayer',
]);

function safeStartMillis(value: string) {
  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? millis : null;
}

export function resolveLiveOccurrenceState(
  occurrence: Pick<CanonicalEventOccurrence, 'durationMinutes' | 'startsAtUtc' | 'status'>,
  nowMillis: number,
): LiveOccurrenceState {
  const startsAtMillis = safeStartMillis(occurrence.startsAtUtc);
  if (startsAtMillis === null) {
    return 'upcoming';
  }

  const endsAtMillis = startsAtMillis + Math.max(1, occurrence.durationMinutes) * 60 * 1000;
  if (occurrence.status === 'cancelled' || occurrence.status === 'ended' || nowMillis >= endsAtMillis) {
    return 'ended';
  }

  if (occurrence.status === 'live' || (nowMillis >= startsAtMillis && nowMillis < endsAtMillis)) {
    return 'live';
  }

  if (startsAtMillis > nowMillis && startsAtMillis - nowMillis <= WAITING_ROOM_WINDOW_MS) {
    return 'waiting_room';
  }

  return 'upcoming';
}

function toScheduledOccurrence(
  occurrence: CanonicalEventOccurrence,
  nowMillis: number,
): ScheduledEventOccurrence {
  const state = resolveLiveOccurrenceState(occurrence, nowMillis);
  return {
    accessMode: occurrence.accessMode,
    body:
      occurrence.seriesDescription?.trim() ||
      occurrence.seriesPurpose?.trim() ||
      'Join this shared live room.',
    category: occurrence.category?.trim() || 'Live',
    durationMinutes: occurrence.durationMinutes,
    favoriteKey: occurrence.seriesId,
    occurrenceId: occurrence.occurrenceId,
    occurrenceKey: occurrence.occurrenceKey,
    roomId: occurrence.roomId,
    seriesId: occurrence.seriesId,
    seriesKey: occurrence.seriesKey,
    script:
      occurrence.seriesPurpose?.trim() ||
      occurrence.seriesDescription?.trim() ||
      'We gather in shared intention and focus for this live room.',
    source: 'occurrence',
    startsAt: occurrence.startsAtUtc,
    startsCount: occurrence.activeParticipantCount,
    status: state,
    subscriptionKey: `occurrence:${occurrence.occurrenceId}`,
    title: occurrence.seriesName,
    visibilityScope: occurrence.visibilityScope,
  };
}

function dedupeOccurrencesById(occurrences: ScheduledEventOccurrence[]) {
  const byId = new Map<string, ScheduledEventOccurrence>();
  for (const occurrence of occurrences) {
    const key = occurrence.occurrenceId?.trim() || occurrence.occurrenceKey;
    if (!key) {
      continue;
    }
    byId.set(key, occurrence);
  }
  return Array.from(byId.values());
}

function byStartAscending(left: ScheduledEventOccurrence, right: ScheduledEventOccurrence) {
  const leftStart = safeStartMillis(left.startsAt) ?? 0;
  const rightStart = safeStartMillis(right.startsAt) ?? 0;
  return leftStart - rightStart;
}

function byLivePriority(left: ScheduledEventOccurrence, right: ScheduledEventOccurrence) {
  if (right.startsCount !== left.startsCount) {
    return right.startsCount - left.startsCount;
  }
  return byStartAscending(left, right);
}

function makeSection(
  key: LiveFeedSectionKey,
  category: string,
  description: string,
  items: ScheduledEventOccurrence[],
): OccurrenceSection {
  return {
    category,
    description,
    items,
    key,
  };
}

function isStartsWithinNext24Hours(occurrence: ScheduledEventOccurrence, nowMillis: number) {
  const startsAtMillis = safeStartMillis(occurrence.startsAt);
  if (startsAtMillis === null) {
    return false;
  }
  return startsAtMillis > nowMillis && startsAtMillis <= nowMillis + NEXT_24_HOURS_MS;
}

export function buildLiveFeedSections(input: {
  nowMillis: number;
  occurrences: CanonicalEventOccurrence[];
  subscribedAll: boolean;
  subscribedKeys: string[];
}): {
  allItems: ScheduledEventOccurrence[];
  sections: OccurrenceSection[];
} {
  const subscribedSet = new Set(input.subscribedKeys.map((entry) => entry.trim()).filter(Boolean));
  const allItems = dedupeOccurrencesById(
    input.occurrences
      .map((occurrence) => toScheduledOccurrence(occurrence, input.nowMillis))
      .sort(byStartAscending),
  );

  const liveNow = allItems.filter((occurrence) => occurrence.status === 'live').sort(byLivePriority);
  const next24Hours = allItems
    .filter(
      (occurrence) =>
        (occurrence.status === 'waiting_room' || occurrence.status === 'upcoming') &&
        isStartsWithinNext24Hours(occurrence, input.nowMillis),
    )
    .sort(byStartAscending);
  const ritual1111 = allItems
    .filter((occurrence) => occurrence.seriesKey === 'daily-1111-intention-reset')
    .sort(byStartAscending);
  const myCircles = allItems
    .filter((occurrence) => occurrence.visibilityScope === 'circle')
    .sort(byStartAscending);
  const globalFlagships = allItems
    .filter((occurrence) => FLAGSHIP_SERIES_KEYS.has(occurrence.seriesKey ?? ''))
    .sort(byStartAscending);
  const savedReminded = allItems
    .filter((occurrence) => {
      if (input.subscribedAll) {
        return true;
      }
      const subscriptionKey = occurrence.subscriptionKey?.trim() || '';
      return subscriptionKey.length > 0 && subscribedSet.has(subscriptionKey);
    })
    .sort(byStartAscending);

  const sections = [
    makeSection('live_now', 'Live Now', 'Join active shared rooms.', liveNow),
    makeSection(
      'next_24_hours',
      'Next 24 Hours',
      'Upcoming rooms and waiting rooms starting soon.',
      next24Hours,
    ),
    makeSection('ritual_1111', '11:11', 'Daily 11:11 local intention ritual.', ritual1111),
    makeSection('my_circles', 'My Circles', 'Circle-based rooms you can join.', myCircles),
    makeSection(
      'global_flagships',
      'Global Flagships',
      'Shared global moments and curated collective sessions.',
      globalFlagships,
    ),
    makeSection(
      'saved_reminded',
      'Saved / Reminded',
      'Rooms with reminder preferences enabled.',
      savedReminded,
    ),
  ].filter((section) => section.items.length > 0);

  return {
    allItems,
    sections,
  };
}

export function statusLabel(status: LiveOccurrenceState) {
  if (status === 'live') {
    return 'Live now';
  }
  if (status === 'waiting_room') {
    return 'Waiting room';
  }
  if (status === 'ended') {
    return 'Ended';
  }
  return 'Upcoming';
}
