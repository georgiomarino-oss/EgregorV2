# Phase 3A Event Domain Note

Date: 2026-03-08  
Scope: Canonical live-event backend/domain architecture and service-layer compatibility plumbing.

## Canonical Model Applied

Phase 3A implements the redesign-doc canonical chain:

1. `event_series` defines recurring/admin/manual event templates.
2. `event_occurrences` materializes concrete joinable instances.
3. `rooms` provides persisted collaborative room identity (one canonical room per occurrence).
4. `room_participants` provides real participant/presence semantics.
5. Reminder targeting is occurrence/room identity-based via `event_reminder_preferences`.

This replaces client-only synthesized occurrence feeds as the source of truth for joinable live events.

## Existing -> Canonical Table Mapping

## Reused

- `events` is retained for backward compatibility and legacy deep-link targets.
- `event_participants` is retained as transitional compatibility data for legacy clients.
- `user_event_subscriptions` is retained as transitional compatibility storage for older notification keys.
- Existing circle membership/access model is reused for circle-scoped event visibility.

## Added

- `event_series`
- `event_occurrences`
- `rooms`
- `room_participants`
- `event_reminder_preferences`

## Transitional Mapping Rules

1. Legacy `events` rows are mapped to canonical `event_series` + `event_occurrences` with `source_event_id`.
2. Legacy `event_participants` rows are backfilled into `room_participants` for mapped occurrence rooms.
3. Legacy join targets continue to resolve via `get_event_occurrence_by_join_target(...)`.

## Deprecated (Compatibility Kept During Transition)

- Client-synthesized live occurrence scheduling (`useOccurrenceFeed` template/news synthesis) is removed from active Live feed plumbing.
- Pseudo-shared room semantics without persisted occurrence/room identity are deprecated from canonical join flows.

## Occurrence And Room Identity

Identity and join invariants:

1. Every canonical occurrence has one canonical room identity (`rooms.occurrence_id` unique).
2. `ensure_occurrence_room_identity(...)` is the single identity materializer/upserter.
3. `list_event_feed(...)` ensures room identity for visible occurrences before returning feed rows.
4. Join/leave/refresh RPCs operate on resolved occurrence/room targets, never synthetic IDs.
5. Participant counts and active presence derive from `room_participants` only in canonical paths.

## Scheduling Model (Local-Time vs UTC)

`event_series` scheduling modes in this phase:

1. `local_time_daily` + `viewer_local` timezone policy:
   - materialized per timezone with `display_timezone`.
   - includes daily 11:11 local event (`daily-1111-intention-reset`).
2. `utc_interval` + `utc` timezone policy:
   - true shared global UTC cadence (e.g. `global-heartbeat` every 6 hours).
3. `admin_curated` and `manual_trigger`:
   - one-off/special/emergency occurrences triggered via `admin_trigger_event_occurrence(...)`.
   - execution is restricted to privileged backend role (`service_role`); `anon`/`authenticated` do not have execute permissions.

Materialization strategy:

- Deterministic on-demand + rolling-horizon generation in SQL:
  - `materialize_event_occurrences(...)`
  - `refresh_event_occurrence_statuses(...)`
- Feed/list APIs call materialization/refresh in a bounded horizon, so recurrence is server-backed, not client-synthesized.

## Migration Strategy (Safe Evolution)

1. Additive schema introduction (new canonical tables/types/functions, no destructive legacy drops).
2. Backfill legacy events/participants into canonical occurrence-room-participant model.
3. Keep legacy-compatible wrappers while routing new mobile APIs to canonical RPCs.
4. Preserve app compilation with compatibility adapters during staged UX migration.
5. Canonical event-domain RPC execute permissions are explicitly scoped to `authenticated` (and `service_role` where required), with `anon` execute revoked.

Forward-compatibility for future phases:

- Circle-linked events are first-class (`visibility_scope='circle'`, `circle_id`).
- Admin special moments and emergency triggers are first-class series types.
- Reminder preferences now support occurrence/room identity targets.

## Service/Data-Layer Compatibility Assumptions

Current mobile compatibility decisions:

1. `mobile/src/lib/api/data.ts` exposes canonical APIs:
   - `listEventFeed`, `listLiveEventSections`, `getEventSeries`, `getEventOccurrence`,
   - `getEventOccurrenceByJoinTarget`, `ensureJoinableOccurrenceRoom`,
   - `joinEventRoom`, `leaveEventRoom`, `listRoomParticipants`,
   - `getRoomPresenceSummary`, `saveEventReminderPreference`.
2. Legacy fallbacks remain in place when canonical tables/functions are unavailable (migration-lag safety).
3. Deep-link/invite parsing now supports canonical occurrence/room targeting while retaining legacy `events/room` behavior.
4. Existing screens/routes compile with compatibility params; full UX/IA refactor remains Phase 3B.

## Legacy Behavior Explicitly Deferred To Phase 3B

1. Full Events/Live IA and screen redesign.
2. Final removal of legacy `events`/`event_participants` room semantics after rollout telemetry + QA.
3. Full reminder UX beyond current backend/domain targeting support.
