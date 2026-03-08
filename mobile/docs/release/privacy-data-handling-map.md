# Privacy And Data Handling Map (Phase 6A)

Date: 2026-03-08

This map aligns app behavior with current policy/support/deletion web surfaces:

1. `web/app/privacy/page.tsx`
2. `web/app/support/page.tsx`
3. `web/app/account-deletion/page.tsx`
4. `web/app/terms/page.tsx`
5. `web/app/subscriptions/page.tsx`

## 1) Data Domains And Purpose

1. Account and profile
- Tables: `profiles`, `user_privacy_settings`
- Purpose: auth identity, profile settings, visibility controls

2. Collaboration and live participation
- Tables: `circles`, `circle_members`, `circle_invitations`, `rooms`, `room_participants`
- Purpose: invite lifecycle, room join state, collaborative access controls

3. Notifications
- Tables: `notification_device_targets`, `notification_subscriptions`, `notification_queue`
- Purpose: device registration, reminder/invite preferences, dispatch queue

4. Trust and safety
- Tables: `user_blocks`, `moderation_reports`, `moderation_actions`
- Purpose: report/block workflows, moderation audit trail

5. Account deletion
- Table: `account_deletion_requests`
- Purpose: support-reviewed deletion workflow state

6. Observability
- Tables: `mobile_analytics_events`
- SDK: Sentry crash and release tracking
- Purpose: product funnel telemetry and crash diagnosis

## 2) User-Facing Entry Points

1. Privacy controls in app: `ProfileScreen` -> `PrivacyPresencePanel`
2. Support links in app: `ProfileScreen` -> `SafetySupportPanel`
3. Account deletion initiation in app: `ProfileScreen` -> account deletion section
4. Web policy endpoints linked in app:
- Privacy policy
- Support page
- Account deletion policy

## 3) Deletion Flow Mapping

1. In-app request calls `create_account_deletion_request`.
2. Status is surfaced by `get_account_deletion_status`.
3. Web page `web/app/account-deletion/page.tsx` remains external fallback path.
4. Device targets are disabled in deletion flow (Phase 5A behavior retained).

## 4) Access Control Summary

1. User-owned settings and preference tables are protected by RLS owner policies.
2. Queue tables are readable only to owner context for authenticated users.
3. Moderation status updates require operator role checks.
4. Analytics direct writes are blocked; ingestion is through constrained RPC.

## 5) Store Compliance Notes

1. Privacy policy and terms URLs are published and linked.
2. Account deletion is available in-app and on web fallback.
3. Permission rationale is documented separately in `mobile/docs/release/permissions-rationale.md`.
