import assert from 'node:assert/strict';
import test from 'node:test';

import type { ActiveEventUserPresence } from '../src/lib/api/data';
import { buildCanonicalGlobePointMaps } from '../src/features/events/services/globeData';
import {
  resolveGlobePulseIntensity,
  resolveGlobePulseState,
} from '../src/features/events/services/globeVisualState';
import type { ScheduledEventOccurrence } from '../src/features/events/types';

function makeOccurrence(
  overrides: Partial<ScheduledEventOccurrence> & Pick<ScheduledEventOccurrence, 'occurrenceKey'>,
): ScheduledEventOccurrence {
  return {
    body: 'Shared room',
    category: 'Global',
    durationMinutes: 15,
    favoriteKey: 'series-key',
    occurrenceId: '11111111-1111-1111-1111-111111111111',
    occurrenceKey: 'occurrence-key',
    script: 'Shared script',
    seriesKey: 'global-heartbeat',
    source: 'occurrence',
    startsAt: '2026-03-09T12:00:00.000Z',
    startsCount: 0,
    status: 'upcoming',
    subscriptionKey: 'occurrence:11111111-1111-1111-1111-111111111111',
    title: 'Global Heartbeat',
    ...overrides,
  };
}

test('resolveGlobePulseIntensity maps canonical counts into bounded premium buckets', () => {
  const calm = resolveGlobePulseIntensity({
    activePresenceCount: 0,
    occurrence: { startsCount: 0, status: 'upcoming' },
  });
  const steady = resolveGlobePulseIntensity({
    activePresenceCount: 2,
    occurrence: { startsCount: 1, status: 'waiting_room' },
  });
  const vivid = resolveGlobePulseIntensity({
    activePresenceCount: 5,
    occurrence: { startsCount: 3, status: 'live' },
  });
  const radiant = resolveGlobePulseIntensity({
    activePresenceCount: 18,
    occurrence: { startsCount: 30, status: 'live' },
  });

  assert.equal(calm.bucket, 'calm');
  assert.equal(steady.bucket, 'steady');
  assert.equal(vivid.bucket, 'vivid');
  assert.equal(radiant.bucket, 'radiant');
  assert.ok(calm.scale < steady.scale);
  assert.ok(steady.scale < vivid.scale);
  assert.ok(vivid.scale < radiant.scale);
  assert.equal(radiant.signal <= 18, true);
});

test('resolveGlobePulseState differentiates live, waiting, flagship, ritual, and upcoming', () => {
  const live = makeOccurrence({
    occurrenceKey: 'live',
    seriesKey: 'community-room',
    status: 'live',
  });
  const waiting = makeOccurrence({
    occurrenceKey: 'waiting',
    seriesKey: 'community-room',
    status: 'waiting_room',
  });
  const flagship = makeOccurrence({
    occurrenceKey: 'flagship',
    seriesKey: 'global-heartbeat',
    status: 'upcoming',
  });
  const ritual = makeOccurrence({
    occurrenceKey: 'ritual',
    seriesKey: 'daily-1111-intention-reset',
    status: 'upcoming',
  });
  const upcoming = makeOccurrence({
    occurrenceKey: 'upcoming',
    seriesKey: 'community-room',
    status: 'upcoming',
  });

  assert.equal(resolveGlobePulseState(live), 'live');
  assert.equal(resolveGlobePulseState(waiting), 'waiting_room');
  assert.equal(resolveGlobePulseState(flagship), 'flagship');
  assert.equal(resolveGlobePulseState(ritual), 'ritual_1111');
  assert.equal(resolveGlobePulseState(upcoming), 'upcoming');
});

test('buildCanonicalGlobePointMaps maps canonical 24h pulses, accents, and insight payloads', () => {
  const nowTick = Date.parse('2026-03-09T12:00:00.000Z');
  const occurrences: ScheduledEventOccurrence[] = [
    makeOccurrence({
      occurrenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      occurrenceKey: 'live-1',
      seriesKey: 'community-room',
      startsAt: '2026-03-09T11:55:00.000Z',
      startsCount: 9,
      status: 'live',
      title: 'Live room',
    }),
    makeOccurrence({
      occurrenceId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      occurrenceKey: 'waiting-1',
      seriesKey: 'daily-1111-intention-reset',
      startsAt: '2026-03-09T12:12:00.000Z',
      status: 'waiting_room',
      title: '11:11 room',
    }),
    makeOccurrence({
      occurrenceId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      occurrenceKey: 'upcoming-1',
      seriesKey: 'global-heartbeat',
      startsAt: '2026-03-09T18:00:00.000Z',
      status: 'upcoming',
      title: 'Flagship room',
    }),
    makeOccurrence({
      occurrenceId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      occurrenceKey: 'future-1',
      seriesKey: 'community-room',
      startsAt: '2026-03-11T12:00:00.000Z',
      status: 'upcoming',
      title: 'Outside horizon',
    }),
  ];

  const result = buildCanonicalGlobePointMaps({
    activePresence: [],
    allScheduledEvents: occurrences,
    nowTick,
  });

  assert.equal(result.mapOccurrenceByPointId.size, 3);
  assert.equal(result.liveRingPoints.length, 1);
  assert.equal(result.waitingRingPoints.length, 1);
  assert.equal(result.upcomingRingPoints.length, 1);
  assert.equal(result.newsRingPoints.length, 0);
  assert.equal(result.ritualAccentPoints.length, 1);
  assert.equal(result.flagshipAccentPoints.length, 1);
  assert.ok(result.mapOccurrenceByPointId.has('occurrence-live-1'));
  assert.ok(result.mapOccurrenceByPointId.has('occurrence-waiting-1'));
  assert.ok(result.mapOccurrenceByPointId.has('occurrence-upcoming-1'));
  assert.ok(!result.mapOccurrenceByPointId.has('occurrence-future-1'));

  const liveInsight = result.pointInsightByPointId.get('occurrence-live-1');
  assert.ok(liveInsight);
  assert.equal(liveInsight?.canonicalState, 'live');
  assert.equal(typeof liveInsight?.pulseScale, 'number');
});

test('buildCanonicalGlobePointMaps uses room-level active clusters instead of per-user dots', () => {
  const nowTick = Date.parse('2026-03-09T12:00:00.000Z');
  const liveOccurrence = makeOccurrence({
    occurrenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    occurrenceKey: 'live-1',
    startsAt: '2026-03-09T11:55:00.000Z',
    status: 'live',
    title: 'Live room',
  });

  const activePresence: ActiveEventUserPresence[] = [
    {
      eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      lastSeenAt: '2026-03-09T12:00:00.000Z',
      userId: 'user-1',
    },
    {
      eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      lastSeenAt: '2026-03-09T12:00:01.000Z',
      userId: 'user-2',
    },
    {
      eventId: 'live-1',
      lastSeenAt: '2026-03-09T12:00:02.000Z',
      userId: 'user-3',
    },
    {
      eventId: 'non-canonical-target',
      lastSeenAt: '2026-03-09T12:00:03.000Z',
      userId: 'user-4',
    },
  ];

  const result = buildCanonicalGlobePointMaps({
    activePresence,
    allScheduledEvents: [liveOccurrence],
    nowTick,
  });

  assert.equal(result.activeClusterPoints.length, 1);
  assert.equal(result.activeClusterPoints[0]?.id, 'presence-live-1');
  assert.equal(result.activeClusterPoints[0]?.properties?.presence_bucket, 2);
});
