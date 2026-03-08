# Phase 5A Manual QA

Date: 2026-03-08  
Scope: Notifications foundation, trust/safety, privacy controls, account-deletion initiation.

## Prerequisites

1. Apply migrations through `20260308140000_phase_5a_notifications_safety_privacy_deletion.sql`.
2. Run app with authenticated test users in at least one shared circle.
3. Use a physical iOS/Android device for push-token registration checks.

## 1) Device Push Target Registration

1. Sign in on device.
2. Grant notification permission when prompted.
3. Verify `notification_device_targets` has one row for current user with:
   - non-empty `installation_id`
   - non-empty `device_token`
   - `push_provider='expo'`
4. Sign out, sign back in, and confirm the same installation row is updated (not duplicated).

## 2) Reminder Preference Persistence (Canonical)

1. Open a Live occurrence in `EventDetailsScreen` and toggle reminder on.
2. Confirm:
   - `event_reminder_preferences` row exists for occurrence.
   - `notification_subscriptions` row exists with:
     - `category='occurrence_reminder'`
     - `target_type='event_occurrence'`
     - matching occurrence id.
3. Toggle reminder off and confirm both canonical records reflect disabled state.
4. Repeat toggle multiple times; ensure no duplicate subscription rows.

## 3) Invite Notification Targeting Hook

1. From circle manager flow, create in-app invite for another user.
2. Confirm `notification_queue` receives a pending `invite`/`circle_invite` row for target user.
3. Set target user global invite preference disabled and create another invite.
4. Confirm no new invite queue row is added.

## 4) Privacy Controls

1. In Profile, verify deletion/support panel renders and status text appears.
2. Update privacy settings through API (or direct client hook) to:
   - `live_presence_visibility='hidden'`
   - `member_list_visibility='circles_only'`
   - direct invites disabled.
3. Confirm:
   - `user_privacy_settings` persists updates.
   - `profiles.presence_visibility` mirrors `live_presence_visibility`.
4. Validate another user cannot see hidden presence through `list_room_participants` / `list_active_occurrence_presence`.

## 5) Blocking

1. In `CircleDetailsScreen` manage sheet, block another member.
2. Confirm `user_blocks` row persists.
3. Attempt blocked pair restricted co-join in circle room:
   - blocker enters room
   - blocked user join attempt fails.
4. Attempt to invite blocked user; ensure invite creation is denied.

## 6) Reporting

1. Submit user report from `CircleDetailsScreen`.
2. Submit invite report from `InviteDecisionScreen`.
3. Submit live occurrence report from `EventDetailsScreen`.
4. Confirm `moderation_reports` rows include:
   - reporter id
   - target type/id
   - reason code
   - support routing metadata.
5. Confirm `moderation_actions` includes initial report-note records.

## 7) Account Deletion Initiation

1. In `ProfileScreen`, trigger "Request account deletion".
2. Confirm:
   - `account_deletion_requests` row with `status='requested'`
   - `profiles.account_state='deletion_requested'`
   - active `notification_device_targets.disabled_at` set.
3. Trigger request again; confirm idempotent behavior (single active request).
4. Open policy/support links and verify they route to:
   - `https://egregor.world/account-deletion`
   - `https://egregor.world/support`

## 8) Least-Privilege Data Access

1. Authenticated user A cannot read user B:
   - device targets
   - blocks
   - deletion requests
   - moderation reports
2. Reporter can read own moderation reports.
3. Non-operator cannot transition moderation status.
4. Operator JWT (`app_metadata.role=support|moderator|admin`) can transition report status and creates moderation action log.

## 9) Backward Compatibility Smoke

1. Reminder toggles in `EventDetailsScreen` and `EventRoomScreen` compile and persist.
2. Existing circles invite/membership flows still operate for eligible users.
3. Phase 3B/4B live/cinematic surfaces render without runtime crashes.
