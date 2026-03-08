# Store Readiness Foundation (Phase 6A)

Date: 2026-03-08

## Ready In Repo

1. Android release signing path hardened (no debug-sign fallback).
2. Android permission footprint narrowed and documented.
3. Notification queue dispatch worker implemented for invite/reminder categories.
4. Crash + release tracking baseline added with Sentry integration points.
5. Product analytics baseline added with mobile event RPC storage.
6. Automated release-baseline test script added.
7. Policy/support/deletion mapping documented.

## Still Manual / Operational

1. Provision and rotate runtime secrets:
- Android signing credentials
- Sentry DSN
- dispatch worker shared secret
- optional Expo access token
2. Configure dispatch scheduler cadence in production.
3. Device validation for push delivery across Android/iOS OS versions.
4. iOS native capability/signing review (native iOS project not present in this repo snapshot).
5. Store metadata, screenshots, and final review questionnaire completion.

## Linked Runbooks

1. `mobile/docs/release/android-release-setup.md`
2. `mobile/docs/release/android-native-source-of-truth.md`
3. `mobile/docs/release/ios-release-manual-checks.md`
4. `mobile/docs/release/permissions-rationale.md`
5. `mobile/docs/release/notification-delivery-readiness.md`
6. `mobile/docs/release/observability-and-analytics.md`
7. `mobile/docs/release/privacy-data-handling-map.md`
8. `mobile/docs/release/pre-submission-checklist.md`
