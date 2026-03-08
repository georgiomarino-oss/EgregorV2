# Canonical Domain Model

Date: 2026-03-08

## 1) Design Goals

The domain model must make collaboration real, reduce semantic ambiguity, and support commercial reliability:

1. Real invitations and membership states.
2. Real persisted rooms for all collaborative sessions.
3. Config-driven recurring events.
4. Strong trust/safety primitives.
5. Backward-compatible migration from current tables and mobile flows.

## 2) Current Model Gaps (Grounded In Repo)

1. `circle_members` and circle RPC flows are owner-centric (`20260304113000_prayer_circle_management_rpc.sql`, `20260304121000_events_circle_management_rpc.sql`).
2. No invitation entity or lifecycle table (internal/external invites are mostly immediate add or share text).
3. Event occurrences in app are partly synthesized client-side (`mobile/src/features/events/utils/occurrence.ts`), while some joins rely on persisted `events` rows.
4. `EventRoomScreen` can open collaborative-looking flows without canonical persisted room identity for every case.
5. No first-class moderation/report/block data model.

## 3) Canonical Entities And Source Of Truth

## 3.1 Identity

### `auth.users` (existing, reuse)
- Purpose: authentication principal.
- Decision: unchanged.

### `profiles` (existing, extend)
- Current use: preference bootstrap in `fetchUserPreferences`.
- Add fields: `display_name`, `username`, `avatar_url`, `bio`, `timezone`, `locale`, `presence_visibility`, `account_state`, `deleted_at`.
- Decision: reuse table and evolve.

## 3.2 Circles

### `circles` (existing, extend)
- Add fields: `slug`, `description`, `visibility` (`private`, `discoverable`, `public`), `primary_timezone`, `default_room_policy`.
- Keep `created_by` as provenance only, not sole governance anchor.

### `circle_memberships` (canonical entity, transitional over `circle_members`)
- Canonical fields:
  - `id`
  - `circle_id`
  - `user_id`
  - `role` (`owner`, `steward`, `member`)
  - `status` (`pending`, `active`, `removed`)
  - `source_invitation_id` (nullable)
  - `joined_at`, `left_at`
- Migration: extend `circle_members` first, then optionally rename or provide compatibility view.

### `circle_roles` (reference entity)
- Enum/reference for role capabilities.
- Stored as enum + policy logic, or dedicated reference table for admin portability.

## 3.3 Invitations

### `circle_invitations` (new)
- Purpose: canonical invitation lifecycle.
- Fields:
  - `id`
  - `circle_id`
  - `inviter_user_id`
  - `target_user_id` (nullable for external)
  - `target_contact_hash` (email/phone hash for external)
  - `target_contact_label` (masked label for UI)
  - `invite_token` (for deep links)
  - `channel` (`in_app`, `link`, `email`, `sms`)
  - `status` (`pending`, `accepted`, `declined`, `revoked`, `expired`)
  - `expires_at`, `responded_at`, `created_at`
  - `abuse_score`, `rate_limited_until` (optional anti-abuse fields)

### `invitation_events` (optional audit entity)
- Tracks transitions for compliance and support investigations.

## 3.4 Events And Scheduling

### `event_series` (new)
- Purpose: config-driven recurring definitions.
- Fields:
  - `id`, `key`, `name`, `category`, `purpose`
  - `schedule_type` (`local_time_daily`, `utc_rrule`, `admin_curated`, `manual_trigger`)
  - `local_time` (nullable), `rrule`/`cron` (nullable), `timezone_policy`
  - `default_duration_minutes`
  - `target_state`
  - `visibility_scope` (`global`, `circle`, `private`)
  - `circle_id` (nullable)
  - `is_active`

### `event_occurrences` (new)
- Purpose: materialized joinable instances.
- Fields:
  - `id`
  - `series_id`
  - `starts_at_utc`, `ends_at_utc`
  - `display_timezone`
  - `status` (`scheduled`, `live`, `ended`, `cancelled`)
  - `join_window_start`, `join_window_end`
  - `room_id` (nullable until room created)
- Replaces client-only occurrence synthesis as source of truth.

### `events` (existing)
- Current table is mixed curated event content + joinable instances.
- Canonical direction: keep for backward compatibility during migration; phase into `event_series`/`event_occurrences` responsibilities.

## 3.5 Rooms

### `rooms` (new canonical)
- Purpose: a persisted collaborative session identity for every live join flow.
- Fields:
  - `id`
  - `room_kind` (`event_occurrence`, `shared_solo`, `circle_dropin`)
  - `occurrence_id` (nullable)
  - `circle_id` (nullable)
  - `host_user_id` (nullable)
  - `status` (`open`, `locked`, `ended`)
  - `started_at`, `ended_at`
  - `metadata`

### `room_participants` (new canonical)
- Fields:
  - `id`, `room_id`, `user_id`
  - `role` (`host`, `participant`, `moderator`)
  - `joined_at`, `left_at`
  - `presence_state`

### Transitional mappings
- `shared_solo_sessions` + `shared_solo_participants` remain active initially; map as `room_kind=shared_solo`.
- `event_participants` remains active initially; map to `room_participants` for occurrence rooms.

## 3.6 Notifications

### `notification_subscriptions` (canonical entity; extend `user_event_subscriptions`)
- Add support for:
  - channel preferences (push/email/in-app)
  - reminder lead times
  - quiet hours
  - category toggles (`daily_rhythm`, `global_moment`, `circle_event`, `emergency`)

### `notification_queue` (new operational entity)
- Job-ready queue used by scheduler/worker to dispatch reminders.

## 3.7 Trust And Safety

### `user_blocks` (new)
- `blocker_user_id`, `blocked_user_id`, `reason`, timestamps.
- Enforced in discoverability, invites, and room joins.

### `moderation_reports` (new)
- Report source/target details:
  - target type (`user`, `circle`, `event_occurrence`, `room`, `message`)
  - target id
  - reporter
  - reason code + free text
  - evidence metadata
  - status (`open`, `triaged`, `resolved`, `dismissed`)

### `moderation_actions` (new)
- Action log (warn, remove, suspend, block, escalation).

## 3.8 Journal And Progress

### `user_journal_entries` (existing, reuse)
- Keep current journaling continuity.
- Add optional links: `related_occurrence_id`, `related_room_id`, mood tags.

### `user_practice_progress` (new optional aggregate)
- Derived streaks and engagement metrics for re-engagement flows.

## 4) Relationship Map (Canonical)

1. User (`auth.users`) has one Profile.
2. User joins many Circle Memberships.
3. Circle has many Invitations and Memberships.
4. Event Series materializes many Event Occurrences.
5. Event Occurrence may open one Room.
6. Room has many Room Participants.
7. User has many Notification Subscriptions.
8. User can create many Reports and many Blocks.
9. Journal entries may link to occurrences/rooms.

## 5) Rules And Invariants

1. A collaborative room is valid only if persisted in `rooms`.
2. Accepting an invitation is the only path from non-member to active circle member.
3. Circle role governs permissions; `created_by` alone does not.
4. All recurring events shown in Live are backed by `event_occurrences`.
5. Blocked users cannot invite each other, appear in each other's circle discovery, or co-join private circle rooms.
6. Presence visibility is profile-configurable and respected by all APIs.

## 6) How This Resolves Current Problems

1. Owner-centric circles -> role-based memberships with steward support.
2. Weak "shared with me" -> invitation and membership inbox entities.
3. No invite lifecycle -> canonical `circle_invitations` states and auditability.
4. Mixed room semantics -> single persisted room identity for all live joins.
5. Fake shared rooms -> non-persisted collaborative paths are deprecated from launch-critical journeys.

## 7) Migration Strategy (Safe, Incremental)

1. Add new canonical tables alongside existing ones.
2. Add compatibility views/RPC wrappers so current mobile code keeps working.
3. Move mobile reads/writes screen-by-screen to canonical APIs.
4. Decommission legacy code paths only after parity telemetry and QA pass.
