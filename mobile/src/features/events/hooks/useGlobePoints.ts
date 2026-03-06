import { useEffect, useMemo, useState } from 'react';

import * as Location from 'expo-location';

import type { ActiveEventUserPresence, AppEvent } from '../../../lib/api/data';
import type { Coordinate, GlobePoint, ScheduledEventOccurrence } from '../types';
import { isWithinNext24Hours } from '../utils/occurrence';
import {
  clampCoordinate,
  jitterCoordinate,
  resolveEventCoordinate,
  toFeatureCollection,
} from '../utils/globe';

interface UseGlobePointsInput {
  activePresence: ActiveEventUserPresence[];
  allScheduledEvents: ScheduledEventOccurrence[];
  events: AppEvent[];
  mapboxReady: boolean;
  nowTick: number;
}

interface UseGlobePointsResult {
  liveRingGeoJson: ReturnType<typeof toFeatureCollection>;
  mapEventByPointId: Map<string, AppEvent>;
  mapOccurrenceByPointId: Map<string, ScheduledEventOccurrence>;
  newsRingGeoJson: ReturnType<typeof toFeatureCollection>;
  scheduledRingGeoJson: ReturnType<typeof toFeatureCollection>;
  userGeoJson: ReturnType<typeof toFeatureCollection>;
}

export function useGlobePoints({
  activePresence,
  allScheduledEvents,
  events,
  mapboxReady,
  nowTick,
}: UseGlobePointsInput): UseGlobePointsResult {
  const [deviceCoordinate, setDeviceCoordinate] = useState<Coordinate | null>(null);

  useEffect(() => {
    if (!mapboxReady) {
      return;
    }

    let active = true;

    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!active) {
        return;
      }

      setDeviceCoordinate(
        clampCoordinate([currentLocation.coords.longitude, currentLocation.coords.latitude]),
      );
    };

    void requestLocation();

    return () => {
      active = false;
    };
  }, [mapboxReady]);

  const eventCoordinatesById = useMemo(() => {
    const byId = new Map<string, Coordinate>();

    for (const event of events) {
      byId.set(
        event.id,
        resolveEventCoordinate({
          countryCode: event.countryCode,
          description: event.description,
          region: event.region,
          seed: event.id,
          title: event.title,
        }),
      );
    }

    return byId;
  }, [events]);

  const mapRingPoints = useMemo(() => {
    const nowMillis = nowTick;
    const points: GlobePoint[] = [];

    for (const event of events) {
      if (!isWithinNext24Hours(event.startsAt, event.durationMinutes, nowMillis)) {
        continue;
      }

      points.push({
        coordinate:
          eventCoordinatesById.get(event.id) ??
          resolveEventCoordinate({
            countryCode: event.countryCode,
            description: event.description,
            region: event.region,
            seed: event.id,
            title: event.title,
          }),
        id: `event-${event.id}`,
        kind: event.status === 'live' ? 'live' : 'scheduled',
      });
    }

    for (const occurrence of allScheduledEvents) {
      if (!isWithinNext24Hours(occurrence.startsAt, occurrence.durationMinutes, nowMillis)) {
        continue;
      }

      const coordinate = resolveEventCoordinate({
        countryCode: occurrence.countryCode ?? null,
        description: occurrence.body,
        locationHint: occurrence.locationHint ?? null,
        region: occurrence.category,
        seed: occurrence.occurrenceKey,
        title: occurrence.title,
      });

      points.push({
        coordinate,
        id: `occurrence-${occurrence.occurrenceKey}`,
        kind:
          occurrence.status === 'live'
            ? 'live'
            : occurrence.source === 'news'
              ? 'news'
              : 'scheduled',
      });
    }

    return points;
  }, [allScheduledEvents, eventCoordinatesById, events, nowTick]);

  const mapUserPoints = useMemo(() => {
    const dedupedPresenceByUser = new Map<string, ActiveEventUserPresence>();

    for (const entry of activePresence) {
      const existing = dedupedPresenceByUser.get(entry.userId);
      if (!existing) {
        dedupedPresenceByUser.set(entry.userId, entry);
        continue;
      }

      const existingTime = new Date(existing.lastSeenAt).getTime();
      const nextTime = new Date(entry.lastSeenAt).getTime();
      if (nextTime > existingTime) {
        dedupedPresenceByUser.set(entry.userId, entry);
      }
    }

    const points: GlobePoint[] = [];
    for (const presence of dedupedPresenceByUser.values()) {
      const baseCoordinate =
        eventCoordinatesById.get(presence.eventId) ??
        resolveEventCoordinate({
          seed: `${presence.eventId}-${presence.userId}`,
          title: `participant-${presence.eventId}`,
        });

      points.push({
        coordinate: jitterCoordinate(baseCoordinate, presence.userId, 0.3),
        id: `user-${presence.userId}`,
        kind: 'user',
      });
    }

    if (deviceCoordinate) {
      points.unshift({
        coordinate: deviceCoordinate,
        id: 'user-device',
        kind: 'user',
      });
    }

    return points;
  }, [activePresence, deviceCoordinate, eventCoordinatesById]);

  const liveRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'live')),
    [mapRingPoints],
  );

  const scheduledRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'scheduled')),
    [mapRingPoints],
  );

  const newsRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'news')),
    [mapRingPoints],
  );

  const userGeoJson = useMemo(() => toFeatureCollection(mapUserPoints), [mapUserPoints]);

  const mapEventByPointId = useMemo(() => {
    const byPointId = new Map<string, AppEvent>();
    for (const event of events) {
      if (!isWithinNext24Hours(event.startsAt, event.durationMinutes, nowTick)) {
        continue;
      }

      byPointId.set(`event-${event.id}`, event);
    }

    return byPointId;
  }, [events, nowTick]);

  const mapOccurrenceByPointId = useMemo(() => {
    const byPointId = new Map<string, ScheduledEventOccurrence>();
    for (const occurrence of allScheduledEvents) {
      if (!isWithinNext24Hours(occurrence.startsAt, occurrence.durationMinutes, nowTick)) {
        continue;
      }

      byPointId.set(`occurrence-${occurrence.occurrenceKey}`, occurrence);
    }

    return byPointId;
  }, [allScheduledEvents, nowTick]);

  return {
    liveRingGeoJson,
    mapEventByPointId,
    mapOccurrenceByPointId,
    newsRingGeoJson,
    scheduledRingGeoJson,
    userGeoJson,
  };
}
