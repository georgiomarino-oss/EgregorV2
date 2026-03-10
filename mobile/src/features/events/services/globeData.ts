import type { ActiveEventUserPresence } from '../../../lib/api/data';
import type { GlobePoint, ScheduledEventOccurrence } from '../types';
import {
  resolveGlobePulseIntensity,
  resolveGlobePulseState,
  type GlobePulseBucket,
  type GlobePulseState,
} from './globeVisualState';
import { jitterCoordinate, resolveEventCoordinate } from '../utils/globe';
import { isWithinNext24Hours } from '../utils/occurrence';

function toOccurrenceCoordinate(occurrence: ScheduledEventOccurrence) {
  return resolveEventCoordinate({
    countryCode: occurrence.countryCode ?? null,
    description: occurrence.body,
    locationHint: occurrence.locationHint ?? null,
    region: occurrence.category,
    seed: occurrence.occurrenceKey,
    title: occurrence.title,
  });
}

function toPresenceBucket(count: number) {
  if (count <= 0) {
    return 0;
  }
  if (count <= 2) {
    return 1;
  }
  if (count <= 5) {
    return 2;
  }
  if (count <= 9) {
    return 3;
  }
  return 4;
}

function toPresenceScale(count: number) {
  const bucket = toPresenceBucket(count);
  if (bucket <= 1) {
    return 0.9;
  }
  if (bucket === 2) {
    return 1.02;
  }
  if (bucket === 3) {
    return 1.14;
  }
  return 1.24;
}

function normalizeCanonicalState(status: ScheduledEventOccurrence['status']) {
  if (status === 'live') {
    return 'live';
  }
  if (status === 'waiting_room' || status === 'soon') {
    return 'waiting_room';
  }
  return 'upcoming';
}

export interface GlobePointInsight {
  activePresenceCount: number;
  canonicalState: 'live' | 'upcoming' | 'waiting_room';
  intensityBucket: GlobePulseBucket;
  intensityLabel: string;
  isFlagship: boolean;
  isRitual1111: boolean;
  pulseScale: number;
  pulseState: GlobePulseState;
}

export interface CanonicalGlobePointMaps {
  activeClusterPoints: GlobePoint[];
  flagshipAccentPoints: GlobePoint[];
  liveRingPoints: GlobePoint[];
  mapOccurrenceByPointId: Map<string, ScheduledEventOccurrence>;
  newsRingPoints: GlobePoint[];
  pointInsightByPointId: Map<string, GlobePointInsight>;
  ritualAccentPoints: GlobePoint[];
  upcomingRingPoints: GlobePoint[];
  waitingRingPoints: GlobePoint[];
}

export function buildCanonicalGlobePointMaps(input: {
  activePresence: ActiveEventUserPresence[];
  allScheduledEvents: ScheduledEventOccurrence[];
  nowTick: number;
}): CanonicalGlobePointMaps {
  const next24Occurrences = input.allScheduledEvents.filter((occurrence) =>
    isWithinNext24Hours(occurrence.startsAt, occurrence.durationMinutes, input.nowTick),
  );

  const coordinateByOccurrenceKey = new Map<string, [number, number]>();
  const occurrenceByTarget = new Map<string, ScheduledEventOccurrence>();

  for (const occurrence of next24Occurrences) {
    coordinateByOccurrenceKey.set(occurrence.occurrenceKey, toOccurrenceCoordinate(occurrence));
    occurrenceByTarget.set(occurrence.occurrenceKey, occurrence);
    const canonicalId = occurrence.occurrenceId?.trim();
    if (canonicalId) {
      occurrenceByTarget.set(canonicalId, occurrence);
    }
  }

  const presenceByOccurrenceKey = new Map<string, Set<string>>();
  for (const presence of input.activePresence) {
    const targetKey = presence.eventId?.trim();
    if (!targetKey) {
      continue;
    }

    const matchedOccurrence = occurrenceByTarget.get(targetKey);
    if (!matchedOccurrence) {
      continue;
    }

    const dedupedByUser = presenceByOccurrenceKey.get(matchedOccurrence.occurrenceKey) ?? new Set();
    dedupedByUser.add(presence.userId);
    presenceByOccurrenceKey.set(matchedOccurrence.occurrenceKey, dedupedByUser);
  }

  const liveRingPoints: GlobePoint[] = [];
  const waitingRingPoints: GlobePoint[] = [];
  const upcomingRingPoints: GlobePoint[] = [];
  const newsRingPoints: GlobePoint[] = [];
  const flagshipAccentPoints: GlobePoint[] = [];
  const ritualAccentPoints: GlobePoint[] = [];
  const mapOccurrenceByPointId = new Map<string, ScheduledEventOccurrence>();
  const pointInsightByPointId = new Map<string, GlobePointInsight>();

  for (const occurrence of next24Occurrences) {
    const coordinate = coordinateByOccurrenceKey.get(occurrence.occurrenceKey);
    if (!coordinate) {
      continue;
    }

    const pointId = `occurrence-${occurrence.occurrenceKey}`;
    const activePresenceCount = presenceByOccurrenceKey.get(occurrence.occurrenceKey)?.size ?? 0;
    const pulseIntensity = resolveGlobePulseIntensity({
      activePresenceCount,
      occurrence,
    });
    const pulseState = resolveGlobePulseState(occurrence);
    const canonicalState = normalizeCanonicalState(occurrence.status);
    const isFlagship = pulseState === 'flagship';
    const isRitual1111 = pulseState === 'ritual_1111';
    const baseKind: GlobePoint['kind'] =
      occurrence.category.toLowerCase().startsWith('news') && canonicalState !== 'live'
        ? 'news'
        : canonicalState === 'live'
          ? 'live'
          : 'scheduled';

    const properties = {
      active_presence_count: activePresenceCount,
      canonical_state: canonicalState,
      id: pointId,
      intensity_bucket: pulseIntensity.bucket,
      intensity_label: pulseIntensity.label,
      intensity_signal: pulseIntensity.signal,
      is_flagship: isFlagship ? 1 : 0,
      is_ritual_1111: isRitual1111 ? 1 : 0,
      marker_scale: pulseIntensity.scale,
      presence_bucket: toPresenceBucket(activePresenceCount),
      pulse_state: pulseState,
    } as const;

    const basePoint: GlobePoint = {
      coordinate,
      id: pointId,
      kind: baseKind,
      properties,
    };

    mapOccurrenceByPointId.set(pointId, occurrence);
    pointInsightByPointId.set(pointId, {
      activePresenceCount,
      canonicalState,
      intensityBucket: pulseIntensity.bucket,
      intensityLabel: pulseIntensity.label,
      isFlagship,
      isRitual1111,
      pulseScale: pulseIntensity.scale,
      pulseState,
    });

    if (canonicalState === 'live') {
      liveRingPoints.push(basePoint);
    } else if (canonicalState === 'waiting_room') {
      waitingRingPoints.push(basePoint);
    } else if (baseKind === 'news') {
      newsRingPoints.push(basePoint);
    } else {
      upcomingRingPoints.push(basePoint);
    }

    if (isFlagship) {
      flagshipAccentPoints.push({
        coordinate,
        id: pointId,
        kind: baseKind,
        properties,
      });
    }

    if (isRitual1111) {
      ritualAccentPoints.push({
        coordinate,
        id: pointId,
        kind: baseKind,
        properties,
      });
    }
  }

  const activeClusterPoints: GlobePoint[] = [];
  for (const [occurrenceKey, users] of presenceByOccurrenceKey) {
    const coordinate = coordinateByOccurrenceKey.get(occurrenceKey);
    if (!coordinate) {
      continue;
    }

    const activeCount = users.size;
    activeClusterPoints.push({
      coordinate: jitterCoordinate(coordinate, `presence-${occurrenceKey}`, 0.22),
      id: `presence-${occurrenceKey}`,
      kind: 'user',
      properties: {
        marker_scale: toPresenceScale(activeCount),
        presence_bucket: toPresenceBucket(activeCount),
      },
    });
  }

  return {
    activeClusterPoints,
    flagshipAccentPoints,
    liveRingPoints,
    mapOccurrenceByPointId,
    newsRingPoints,
    pointInsightByPointId,
    ritualAccentPoints,
    upcomingRingPoints,
    waitingRingPoints,
  };
}
