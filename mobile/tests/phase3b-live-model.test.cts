import assert from 'node:assert/strict';
import test from 'node:test';

import type { CanonicalEventOccurrence } from '../src/lib/api/data';
import { buildEventInviteUrl, parseInviteCaptureTarget } from '../src/lib/invite';
import {
  buildLiveFeedSections,
  resolveLiveOccurrenceState,
  statusLabel,
} from '../src/features/events/services/liveModel';

function makeOccurrence(overrides: Partial<CanonicalEventOccurrence>): CanonicalEventOccurrence {
  return {
    accessMode: 'open',
    activeParticipantCount: 0,
    category: 'Collective',
    circleId: null,
    displayTimezone: 'UTC',
    durationMinutes: 15,
    endsAtUtc: '2026-03-08T12:15:00.000Z',
    occurrenceId: '11111111-1111-1111-1111-111111111111',
    occurrenceKey: 'occurrence-key',
    occurrenceMetadata: {},
    participantCount: 0,
    roomId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    seriesDescription: 'Shared room',
    seriesId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    seriesKey: 'global-heartbeat',
    seriesMetadata: {},
    seriesName: 'Global Heartbeat',
    seriesPurpose: 'Pulse',
    sourceEventId: null,
    startsAtUtc: '2026-03-08T12:00:00.000Z',
    status: 'scheduled',
    visibilityScope: 'global',
    ...overrides,
  };
}

test('resolveLiveOccurrenceState classifies waiting/live/ended correctly', () => {
  const waiting = makeOccurrence({
    durationMinutes: 10,
    startsAtUtc: '2026-03-08T12:10:00.000Z',
    status: 'scheduled',
  });
  const live = makeOccurrence({
    durationMinutes: 10,
    startsAtUtc: '2026-03-08T12:00:00.000Z',
    status: 'live',
  });
  const ended = makeOccurrence({
    durationMinutes: 10,
    startsAtUtc: '2026-03-08T10:00:00.000Z',
    status: 'ended',
  });

  assert.equal(
    resolveLiveOccurrenceState(waiting, Date.parse('2026-03-08T12:00:30.000Z')),
    'waiting_room',
  );
  assert.equal(resolveLiveOccurrenceState(live, Date.parse('2026-03-08T12:05:00.000Z')), 'live');
  assert.equal(resolveLiveOccurrenceState(ended, Date.parse('2026-03-08T12:05:00.000Z')), 'ended');
  assert.equal(statusLabel('waiting_room'), 'Waiting room');
});

test('buildLiveFeedSections emits canonical section grouping', () => {
  const nowMillis = Date.parse('2026-03-08T12:00:00.000Z');
  const occurrences: CanonicalEventOccurrence[] = [
    makeOccurrence({
      activeParticipantCount: 12,
      occurrenceId: '11111111-1111-1111-1111-111111111111',
      seriesKey: 'global-heartbeat',
      startsAtUtc: '2026-03-08T12:00:00.000Z',
      status: 'live',
      visibilityScope: 'global',
    }),
    makeOccurrence({
      occurrenceId: '22222222-2222-2222-2222-222222222222',
      seriesKey: 'daily-1111-intention-reset',
      startsAtUtc: '2026-03-08T12:10:00.000Z',
      status: 'scheduled',
      visibilityScope: 'global',
    }),
    makeOccurrence({
      occurrenceId: '33333333-3333-3333-3333-333333333333',
      seriesKey: 'circle-gathering',
      startsAtUtc: '2026-03-08T13:00:00.000Z',
      status: 'scheduled',
      visibilityScope: 'circle',
    }),
  ];

  const { allItems, sections } = buildLiveFeedSections({
    nowMillis,
    occurrences,
    subscribedAll: false,
    subscribedKeys: ['occurrence:22222222-2222-2222-2222-222222222222'],
  });

  assert.equal(allItems.length, 3);
  assert.ok(allItems.every((item) => item.source === 'occurrence'));
  assert.ok(allItems.every((item) => Boolean(item.occurrenceId)));

  const names = sections.map((section) => section.category);
  assert.ok(names.includes('Live Now'));
  assert.ok(names.includes('Next 24 Hours'));
  assert.ok(names.includes('11:11'));
  assert.ok(names.includes('My Circles'));
  assert.ok(names.includes('Global Flagships'));
  assert.ok(names.includes('Saved / Reminded'));
});

test('parseInviteCaptureTarget prefers canonical room/occurrence params over legacy params', () => {
  const parsed = parseInviteCaptureTarget(
    'egregorv2://events/room?eventId=legacy-123&eventTemplateId=template-abc&occurrenceId=occ-789&roomId=room-456',
  );

  assert.ok(parsed);
  assert.equal(parsed?.eventsRoute, 'EventRoom');
  assert.equal(parsed?.eventRoomParams?.occurrenceId, 'occ-789');
  assert.equal(parsed?.eventRoomParams?.roomId, 'room-456');
  assert.equal(parsed?.eventRoomParams?.eventId, undefined);
  assert.equal(parsed?.eventRoomParams?.eventTemplateId, undefined);
});

test('buildEventInviteUrl prefers canonical room and occurrence links', () => {
  const roomInvite = buildEventInviteUrl({
    eventTitle: 'Global Heartbeat',
    occurrenceId: 'occ-789',
    roomId: 'room-456',
  });
  const occurrenceInvite = buildEventInviteUrl({
    eventTitle: 'Global Heartbeat',
    occurrenceId: 'occ-789',
  });
  const legacyInvite = buildEventInviteUrl({
    eventId: 'legacy-123',
    eventTitle: 'Legacy',
  });

  assert.equal(roomInvite, 'egregorv2://room/room-456');
  assert.equal(occurrenceInvite, 'egregorv2://live/occurrence/occ-789');
  assert.ok(legacyInvite.startsWith('egregorv2://events/room?'));
});
