# Phase 3B Manual QA Checklist

Date: 2026-03-08  
Scope: Live UX/app integration on top of canonical Phase 3A event-domain APIs.

## Setup

1. Apply migrations through `20260308130000_phase_3a_canonical_event_domain.sql`.
2. Ensure local mobile build uses latest `mobile/src/lib/api/data.ts` canonical APIs.
3. Use at least 2 authenticated accounts for participant/presence checks.
4. Ensure there are upcoming and live canonical occurrences in `event_occurrences`.

## Navigation / IA

1. Confirm bottom tab label shows `Live` (route key may remain `EventsTab`).
2. Open Live tab and verify sections are clearly grouped (not one undifferentiated list).
3. Confirm no user-facing card uses template/news synthetic language in primary Live feed.

## Feed Structure And State Truthfulness

1. Verify Live feed sections render from canonical occurrences:
   - `Live Now`
   - `Next 24 Hours`
   - `11:11`
   - `My Circles`
   - `Global Flagships`
   - `Saved / Reminded`
2. For each visible item, verify state is one of:
   - `Live now`
   - `Waiting room`
   - `Upcoming`
   - `Ended`
3. Validate section item counts and summary labels match backend data.
4. Confirm empty state copy appears when no joinable items exist.

## Event Detail Flow

1. Open a live occurrence detail from the feed:
   - confirm state badge/label is correct
   - confirm timing, access mode, and participant metadata are visible
2. Validate primary CTA behavior:
   - live -> `Join now`
   - waiting/upcoming -> waiting-room entry action
   - ended -> disabled/ended behavior
3. Toggle reminder in details and confirm state persists after refresh.

## Room / Waiting-Room Integrity

1. Join from a live item and confirm room opens with canonical occurrence/room target.
2. Join from an upcoming item near start and confirm waiting-room messaging is shown.
3. Verify participant count reflects real presence updates (not synthetic counters).
4. Confirm reminder toggle in room works only when a real occurrence identity exists.
5. Confirm ended rooms show ended state and do not allow false live playback.

## Deep Links / Invites

1. Test canonical links:
   - `egregorv2://live/occurrence/:id`
   - `egregorv2://room/:id`
2. Test legacy `egregorv2://events/room?...` where both canonical and legacy params are present.
3. Verify canonical params (`occurrenceId` / `occurrenceKey` / `roomId`) take precedence over legacy `eventId`/template params.
4. Verify unauthenticated open -> auth handoff -> return to the intended canonical room/detail target.

## Compatibility Checks

1. Confirm app compiles (`npm --prefix mobile run typecheck`).
2. Confirm legacy link parsing still works when canonical IDs are absent.
3. Confirm shared solo and circles navigation are unaffected by Live changes.

## Known Deferred Items (Out Of Phase 3B Scope)

1. Cinematic art-direction overhaul of Live surfaces.
2. Notification channel-level UX expansion (quiet hours/category matrix UI).
3. Full retirement of all legacy event compatibility code paths after telemetry confirms safe removal.
