import { useMemo } from 'react';

import type { ActiveEventUserPresence, AppEvent } from '../../../lib/api/data';
import {
  buildCanonicalGlobePointMaps,
  type GlobePointInsight,
} from '../services/globeData';
import type { ScheduledEventOccurrence } from '../types';
import { toFeatureCollection } from '../utils/globe';

interface UseGlobePointsInput {
  activePresence: ActiveEventUserPresence[];
  allScheduledEvents: ScheduledEventOccurrence[];
  nowTick: number;
}

interface UseGlobePointsResult {
  flagshipAccentGeoJson: ReturnType<typeof toFeatureCollection>;
  liveRingGeoJson: ReturnType<typeof toFeatureCollection>;
  mapEventByPointId: Map<string, AppEvent>;
  mapOccurrenceByPointId: Map<string, ScheduledEventOccurrence>;
  newsRingGeoJson: ReturnType<typeof toFeatureCollection>;
  pointInsightByPointId: Map<string, GlobePointInsight>;
  ritualAccentGeoJson: ReturnType<typeof toFeatureCollection>;
  upcomingRingGeoJson: ReturnType<typeof toFeatureCollection>;
  userGeoJson: ReturnType<typeof toFeatureCollection>;
  waitingRingGeoJson: ReturnType<typeof toFeatureCollection>;
}

export function useGlobePoints({
  activePresence,
  allScheduledEvents,
  nowTick,
}: UseGlobePointsInput): UseGlobePointsResult {
  const {
    activeClusterPoints,
    flagshipAccentPoints,
    liveRingPoints,
    mapOccurrenceByPointId,
    newsRingPoints,
    pointInsightByPointId,
    ritualAccentPoints,
    upcomingRingPoints,
    waitingRingPoints,
  } = useMemo(
    () =>
      buildCanonicalGlobePointMaps({
        activePresence,
        allScheduledEvents,
        nowTick,
      }),
    [activePresence, allScheduledEvents, nowTick],
  );

  const liveRingGeoJson = useMemo(() => toFeatureCollection(liveRingPoints), [liveRingPoints]);
  const waitingRingGeoJson = useMemo(
    () => toFeatureCollection(waitingRingPoints),
    [waitingRingPoints],
  );
  const upcomingRingGeoJson = useMemo(
    () => toFeatureCollection(upcomingRingPoints),
    [upcomingRingPoints],
  );
  const newsRingGeoJson = useMemo(() => toFeatureCollection(newsRingPoints), [newsRingPoints]);
  const flagshipAccentGeoJson = useMemo(
    () => toFeatureCollection(flagshipAccentPoints),
    [flagshipAccentPoints],
  );
  const ritualAccentGeoJson = useMemo(
    () => toFeatureCollection(ritualAccentPoints),
    [ritualAccentPoints],
  );
  const userGeoJson = useMemo(() => toFeatureCollection(activeClusterPoints), [activeClusterPoints]);
  const mapEventByPointId = useMemo(() => new Map<string, AppEvent>(), []);

  return {
    flagshipAccentGeoJson,
    liveRingGeoJson,
    mapEventByPointId,
    mapOccurrenceByPointId,
    newsRingGeoJson,
    pointInsightByPointId,
    ritualAccentGeoJson,
    upcomingRingGeoJson,
    userGeoJson,
    waitingRingGeoJson,
  };
}
