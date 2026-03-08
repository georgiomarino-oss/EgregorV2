# Phase 5A Foundation Note

Date: 2026-03-08  
Scope: Backend/domain foundation for notifications, trust/safety, privacy controls, and in-app account-deletion initiation.

## Canonical Model Restatement (Notifications, Trust, Privacy, Deletion)

Phase 5A adopts the redesign canonical direction:

1. Notifications are persisted against real canonical entities, not UI-only toggles.
2. Device push delivery targets are first-class persisted records (installation + token + platform).
3. Reminder targeting continues to use canonical occurrence/room identity (`event_occurrences`, `rooms`) and now adds canonical invite/circle-social notification targeting.
4. Trust/safety is modeled with first-class block relationships and moderation report lifecycle records.
5. Privacy/presence controls are user-owned settings that directly influence invite eligibility and participant/member visibility behavior.
6. Account deletion is initiated in-app through auditable request state, aligned with web privacy/support/account-deletion messaging.

## Existing Tables/Functions Reused

- `profiles` (existing): remains the identity preference anchor; now paired with dedicated privacy settings and account state semantics.
- `circle_members`, `circle_invitations`, canonical circle RPC stack from Phase 2A (`create_circle_invite`, `accept_circle_invite`, `list_circle_members`, etc.).
- `event_series`, `event_occurrences`, `rooms`, `room_participants`, `save_event_reminder_preference` from Phase 3A.
- `event_reminder_preferences` (existing canonical event reminder targeting).
- `user_event_subscriptions` kept as transitional compatibility storage for migration-era clients.
- `app_user_presence` remains active; visibility behavior is now additionally constrained by privacy/block checks in canonical read paths.

## Extended vs Added Models

### Extended

- Circle invite and room-join functions are extended with block/privacy gates.
- Canonical participant/member listing functions are extended to respect block and privacy visibility constraints.

### Added

- Notification foundation:
  - device push target registrations
  - canonical notification subscription/preference records (`notification_subscriptions`)
  - minimal notification queue scaffold for invite/reminder dispatch plumbing
- Trust/safety foundation:
  - user block relationships with auditable lifecycle
  - moderation reports and moderation actions (minimal workflow)
- Privacy foundation:
  - dedicated user privacy/presence controls (member list visibility, live presence visibility, invite acceptance preferences)
- Account deletion foundation:
  - auditable account deletion request lifecycle/state

## Implemented Tables And RPCs (Phase 5A)

New/extended tables:

1. `user_privacy_settings`
2. `notification_device_targets`
3. `notification_subscriptions`
4. `notification_queue`
5. `user_blocks`
6. `moderation_reports`
7. `moderation_actions`
8. `account_deletion_requests`
9. `profiles` extensions (`username`, `avatar_url`, `bio`, `locale`, `presence_visibility`, `account_state`, `deleted_at`)

New canonical RPC entry points:

1. `register_device_push_target`
2. `update_notification_subscription`
3. `list_my_notification_preferences`
4. `get_my_privacy_settings`
5. `update_my_privacy_settings`
6. `block_user`
7. `unblock_user`
8. `list_my_blocks`
9. `submit_moderation_report`
10. `create_account_deletion_request`
11. `get_account_deletion_status`

Operator lifecycle RPC:

1. `set_moderation_report_status`

## Canonical Connections To Circles/Invites/Occurrences/Rooms

1. Circle invites now consult block/privacy eligibility before creation/acceptance.
2. Invite notifications target real `circle_invitations` identities.
3. Reminder preferences remain occurrence/room-native and are exposed through canonical notification service APIs.
4. Room participant visibility and active presence outputs are filtered by block + privacy rules.
5. Account deletion requests and moderation reports reference canonical user identities and relevant collaborative targets (user/circle/occurrence/room/invite).

## Migration Strategy

1. Additive schema first: new tables/enums/functions and policy hardening without destructive table drops.
2. Keep compatibility tables/functions (`user_event_subscriptions`, existing reminder and circle APIs) while writing new canonical records in parallel where needed.
3. Enforce least-privilege RLS immediately for sensitive domains (device targets, privacy settings, blocks, reports, deletion requests).
4. Keep all new state transitions auditable (`updated_at` + explicit status/action rows).
5. Defer full scheduler/worker fanout and full moderation operator UI to follow-up phases; keep a real queue scaffold and service-role-ready RPC contract in this phase.

## Compatibility Assumptions For Current UI

1. Current Event details/room reminder toggles continue compiling and remain canonical for occurrence reminders.
2. Existing circles/invite UI from Phases 2A/3B remains intact; block/privacy checks are applied at backend function boundaries.
3. Profile cinematic surface from Phase 4 remains intact; this phase adds backend/service hooks and minimal account/privacy/safety plumbing without full UX redesign.
4. Existing support/privacy/account-deletion web URLs remain unchanged and are used as canonical external disclosure surfaces.

## Real vs Deferred In This Phase

Implemented now:

- Real DB-backed device push target registration.
- Real DB-backed notification preference storage + canonical reminder preference APIs.
- Real block/report/privacy/deletion persistence and policy controls.
- Real queue table for dispatch scheduling handoff.
- Existing circles/live canonical RPCs overridden for block/privacy enforcement:
  - `search_invitable_users`, `create_circle_invite`, `accept_circle_invite`, `list_circle_members`
  - `can_join_room`, `join_event_room`, `list_room_participants`, `list_active_occurrence_presence`

Deferred to later phases:

- Full production reminder scheduling workers/fanout infrastructure.
- Full moderation operator console and advanced triage tooling.
- Full Profile UX pass for all new controls and reporting surfaces.
