# Legacy Removal Pass

Date: 2026-03-10
Scope: remove retired screens/routes/adapters and narrow legacy fallbacks while preserving active canonical flows.

## What Was Removed

### User-facing legacy routes/screens

1. Removed `PrayerCircle` compatibility screen and route.
- Deleted: `mobile/src/screens/PrayerCircleScreen.tsx`
- Removed route registration/import from `mobile/src/app/navigation/RootNavigator.tsx`
- Removed route type from `mobile/src/app/navigation/types.ts`

2. Removed `EventsCircle` compatibility screen and route.
- Deleted: `mobile/src/screens/EventsCircleScreen.tsx`
- Removed route registration/import from `mobile/src/app/navigation/RootNavigator.tsx`
- Removed route type from `mobile/src/app/navigation/types.ts`

### Deep-link compatibility paths no longer accepted

1. Removed deep-link mappings for:
- `community/events-circle`
- `community/prayer-circle`

2. Removed deprecated `events/room` deep-link parsing in invite capture resolver.
- `mobile/src/lib/invite.ts` now accepts only canonical Live targets (`live/occurrence/:id`, `room/:id`) for room entry capture.

3. Removed legacy room-parameter parsing from app linking and nav types.
- Removed `eventId`, `eventSource`, `eventTemplateId` from `EventsStackParamList` and linking parse config.

### Legacy adapters and dead components

1. Removed legacy prayer/events-circle adapter functions from circles API.
- Deleted from `mobile/src/lib/api/circles.ts`:
  - `fetchPrayerCircleMembersLegacy`
  - `fetchEventsCircleMembersLegacy`
  - `searchUsersForPrayerCircleLegacy`
  - `addPrayerCircleMemberLegacy`
  - `addEventsCircleMemberLegacy`
  - `removePrayerCircleMemberLegacy`
  - `removeEventsCircleMemberLegacy`

2. Removed legacy adapter wrappers and caches from data API.
- Deleted from `mobile/src/lib/api/data.ts`:
  - prayer/events circle member cache maps
  - `getCachedPrayerCircleMembers`, `getCachedEventsCircleMembers`
  - `fetchPrayerCircleMembers`, `fetchEventsCircleMembers`
  - prayer/events circle add/remove/search wrappers
- Removed these calls from `prefetchCoreAppData`.

3. Removed dead Community-era components not used by canonical screens.
- Deleted:
  - `mobile/src/features/community/components/CircleEntryCards.tsx`
  - `mobile/src/features/community/components/CommunityAlertFeed.tsx`
  - `mobile/src/features/community/components/GlobalPulseHero.tsx`
  - `mobile/src/features/community/components/LiveMetricsPanel.tsx`

4. Removed dead circles member row component.
- Deleted: `mobile/src/features/circles/components/CircleMemberRow.tsx`

## Canonical Replacements Introduced

1. Added canonical invite member context helper:
- `listInviteContextMembers(...)` in `mobile/src/lib/api/circles.ts`

2. Updated room/solo invite composition to use canonical member context:
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/screens/SoloLiveScreen.tsx`

3. Tightened event invite URL generation:
- `buildEventInviteUrl(...)` now emits canonical links only (`room/:id` or `live/occurrence/:id`) and rejects missing canonical targets.

## Navigation and Deep-Link Canonicalization

1. Community stack now contains only canonical Circles routes:
- `CommunityHome`
- `CircleDetails`
- `CircleInviteComposer`
- `InviteDecision`

2. Live stack room/detail params are canonicalized:
- `EventDetails`: `occurrenceId`, `roomId`
- `EventRoom`: `occurrenceId`, `occurrenceKey`, `roomId`, plus room UX params

3. Deprecated `events/room` links are intentionally unsupported by capture parser and tests.

## Intentionally Retained Legacy Code (Documented)

1. `mobile/src/lib/api/data.ts` legacy event-room runtime fallbacks remain for now:
- `fetchLegacyEventRoomSnapshot`
- `joinLegacyEventRoom`
- `leaveLegacyEventRoom`
- `refreshLegacyEventPresence`
- fallback branching in room snapshot/join/leave/presence calls

Reason retained:
- These are backend-migration safety nets for schema/RPC drift, not primary UX routes.
- This pass removed user-facing legacy entry points that generated those paths.

Removal follow-up:
- Remove these fallback functions once launch-stability telemetry confirms no runtime reliance.

## Tests and Verification

Ran successfully:

1. `npm --prefix mobile run typecheck`
2. `npm --prefix mobile run test:phase3b-live`
3. `npm --prefix mobile run test:release-baseline`

Targeted coverage updated:

1. `mobile/tests/phase3b-live-model.test.cts`
- Added assertion that deprecated `events/room` links are rejected.
- Added assertion that deprecated `community/*circle` compatibility links are rejected.
- Updated invite-url test to enforce canonical-only room/occurrence links.

## Remaining Technical Debt After This Pass

1. Legacy event-room data-layer fallbacks remain (intentionally retained above).
2. Empty `mobile/src/features/community/components/` folder can be removed in a follow-up housekeeping commit if desired.
