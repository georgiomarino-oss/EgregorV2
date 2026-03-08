# Mobile Observability And Analytics (Phase 6A)

Date: 2026-03-08

## 1) SDK And Storage Baseline

Crash reporting and release tracking:

1. SDK: `@sentry/react-native`
2. Initialization: `mobile/src/lib/observability/crashReporting.ts`
3. App bootstrap: `mobile/App.tsx`

Product analytics baseline:

1. Client event tracker: `mobile/src/lib/observability/analytics.ts`
2. Storage RPC: `public.track_mobile_analytics_event`
3. Storage table: `public.mobile_analytics_events`

## 2) Required Environment

1. `EXPO_PUBLIC_SENTRY_DSN` (required for crash capture)
2. `EXPO_PUBLIC_RELEASE_ENV` (recommended; set in `mobile/eas.json` profiles)

If Sentry DSN is absent, crash SDK initialization is skipped.

## 3) Release Tracking

Sentry release is set as:

- `egregor-mobile@<appVersion>+<nativeBuildVersion>`

Tags include:

1. `platform`
2. `app_version`
3. `native_build`

## 4) Event Naming

Current tracked events:

1. `auth_entry_viewed`
2. `auth_mode_switched`
3. `auth_submit_started`
4. `auth_submit_succeeded`
5. `auth_submit_failed`
6. `auth_session_active`
7. `circle_invite_created`
8. `circle_invite_viewed`
9. `circle_invite_accepted`
10. `circle_invite_declined`
11. `circle_invite_revoked`
12. `live_details_viewed`
13. `live_reminder_toggled`
14. `live_details_join_pressed`
15. `room_join_succeeded`
16. `room_join_failed`
17. `room_reminder_toggled`
18. `notification_permission_triggered`
19. `notification_permission_result`
20. `trust_action_report`
21. `trust_action_block`
22. `trust_action_unblock`
23. `account_deletion_requested`

## 5) Flow Coverage

1. Auth/onboarding entry: `AuthScreen`, `AuthGate`
2. Circle invite lifecycle: `CircleInviteComposerScreen`, `InviteDecisionScreen`, `CircleDetailsScreen`
3. Live detail -> reminder -> join: `EventDetailsScreen`
4. Reminder permission state actions: `EventDetailsScreen`, `EventRoomScreen`, `ProfileScreen`
5. Room join/failure: `EventRoomScreen`
6. Trust actions (report/block/unblock):
- `CircleDetailsScreen`
- `InviteDecisionScreen`
- `EventDetailsScreen`
- `EventRoomScreen`
- `ProfileScreen`
7. Account deletion initiation: `ProfileScreen`

## 6) Operational Notes

1. Analytics writes are fire-and-forget and should not block user interactions.
2. Event payloads are bounded by RPC validation checks.
3. Direct table writes are not exposed to anon/authenticated roles; writes flow through RPC.
