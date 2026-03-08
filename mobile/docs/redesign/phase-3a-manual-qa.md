# Phase 3A Manual QA Checklist

Date: 2026-03-08  
Scope: Canonical event series -> occurrence -> room backend/domain behavior with compatibility UI plumbing.

## Setup

1. Apply migrations through `20260308130000_phase_3a_canonical_event_domain.sql`.
2. Ensure at least 3 test accounts:
   - circle event owner
   - active circle member
   - outsider (not in circle)
3. Ensure test profiles have valid timezones (for local-time materialization checks).
4. Ensure mobile build uses latest `mobile/src/lib/api/data.ts` canonical APIs.

## Canonical Feed And Occurrence Identity

1. Open Live screen and verify upcoming/live items load from persisted occurrences.
2. Confirm each card resolves to a real occurrence ID (not synthetic template/news key-only records).
3. Confirm each visible occurrence resolves to a real room identity before join.
4. Verify no pseudo-shared scripted room entry path is used for canonical join cards.

## Scheduling / Materialization

1. Verify at least one 11:11 local occurrence exists for a user timezone in DB (`daily-1111-intention-reset`).
2. Verify global UTC moments (`global-heartbeat`) materialize at 00:00/06:00/12:00/18:00 UTC.
3. Verify repeat materialization does not create duplicate `(series_id, starts_at_utc, display_timezone)` rows.
4. Verify status transitions (`scheduled` -> `live` -> `ended`) are reflected by backend status functions, not client-only timing assumptions.

## Join Flow / Room Presence

1. Join a canonical occurrence room from Live.
2. Confirm participant count increments from `room_participants`.
3. Keep room open and verify heartbeat refresh keeps presence active.
4. Leave room and confirm active participant count decrements.
5. Verify room summary and participant list match real persisted rows.

## Circle Visibility Boundaries

1. Create or trigger a circle-scoped occurrence.
2. As circle member, verify occurrence appears in feed and is joinable.
3. As outsider, verify occurrence does not appear in feed and join attempts fail.
4. Verify no broad authenticated-read regressions on private/circle visibility.

## Deep Link / Invite Canonical Targets

1. Test `egregorv2://events/room?...` with canonical `occurrenceId` and/or `roomId` query params.
2. Test `egregorv2://room/:id` direct room target.
3. Test `egregorv2://live/occurrence/:id` occurrence detail target.
4. For each path, verify auth handoff preserves target and resolves a canonical occurrence/room.

## Reminder Targeting

1. Toggle reminder for a canonical occurrence card.
2. Verify preference persists against occurrence identity (`event_reminder_preferences.target_type='occurrence'`).
3. Verify reminder toggle state reloads correctly after app refresh.
4. Verify compatibility fallback does not break older subscription-key behavior.

## Legacy Compatibility Checks

1. Existing app builds/routes still compile and navigate (Event details/room paths intact).
2. Legacy `eventId` deep links still resolve through canonical join-target mapping when possible.
3. Shared solo flows are unaffected.

## Regression Checks

1. No crashes when canonical tables are unavailable (legacy fallback behavior).
2. No realtime subscription errors for `event_occurrences`, `rooms`, `room_participants`.
3. Event details screen refreshes from canonical data updates.
