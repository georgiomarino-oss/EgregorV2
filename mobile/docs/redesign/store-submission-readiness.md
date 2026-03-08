# Store Submission Readiness

Date: 2026-03-08

Scope: Final launch-candidate readiness statement grounded in current repo state and runbooks.

## 1) Android Readiness

Status: materially ready in code/config, pending secret-backed release execution.

Ready now:

1. Durable hardening source is tracked (`mobile/app.json` + `mobile/plugins/withPhase6aAndroidHardening.js`).
2. Release path is hardened to fail when signing inputs are missing (no silent debug-sign fallback for release tasks).
3. Sensitive permission footprint is narrowed and enforced with merged-manifest hardening.
4. Verification helpers and runbooks exist (`mobile/docs/release/android-native-source-of-truth.md`, `mobile/docs/release/android-release-setup.md`).

Still required:

1. Real upload keystore secrets in secure env.
2. Signed `assembleRelease`/AAB evidence with artifact signature validation.

## 2) Android Generated-Native Source-Of-Truth Workflow

`mobile/android` is generated and gitignored in this repo.

Source of truth:

1. `mobile/app.json` (`android.permissions`, `android.blockedPermissions`, plugin wiring).
2. `mobile/plugins/withPhase6aAndroidHardening.js` (release-signing enforcement + merged-manifest hardening).
3. `mobile/scripts/verify-android-merged-manifest.mjs` (post-merge permission checks).

Clean-checkout reproduction baseline:

1. `npm --prefix mobile ci`
2. `npm --prefix mobile run prebuild:android:clean`
3. Follow verification flow in `mobile/docs/release/android-native-source-of-truth.md`.

## 3) iOS Readiness And Unknowns

Status: not store-ready from repo evidence alone.

Current hard limit:

1. `mobile/ios` is absent in this workspace snapshot, so native capability/signing/APNs state cannot be confirmed from committed files.

Required manual closure:

1. Generate iOS native project and confirm signing/team settings.
2. Confirm APNs/push entitlements.
3. Validate permission behavior and push delivery on physical devices.
4. Execute TestFlight build/distribution checks.

Reference: `mobile/docs/release/ios-release-manual-checks.md`.

## 4) Permissions, Privacy, Deletion, Support Mapping

Status: baseline in place and documented.

1. Permission rationale and narrowed Android footprint: `mobile/docs/release/permissions-rationale.md`.
2. Privacy/support/account-deletion pages exist and are mapped: `mobile/docs/release/privacy-data-handling-map.md`.
3. In-app account deletion initiation and support/privacy links are present in Profile flow.

Remaining manual step:

1. Confirm store privacy forms/nutrition labels exactly match runtime behavior and published policy text.

## 5) Analytics And Crash Readiness

Status: serious baseline present, requires release env secrets + operational dashboarding.

Ready now:

1. Sentry crash/release init is integrated and safe when DSN is absent.
2. Mobile analytics events are instrumented for auth/invite/live/reminder/trust/deletion funnels.
3. Event ingestion RPC/table path is implemented.

Still required:

1. Set `EXPO_PUBLIC_SENTRY_DSN` for release profiles.
2. Validate crash + event ingestion in release candidate builds.
3. Define operational dashboards/alerts (outside this code pass).

## 6) Push And Reminder Readiness

Status: queue + dispatch capable; not yet fully production-validated end-to-end.

What is real now:

1. Device registration and preference persistence.
2. Queue creation for relevant categories.
3. Dispatch worker (`dispatch-notification-queue`) with:
- claim/reclaim
- retry/backoff
- terminal failure handling
- invalid token disable behavior
4. Supported categories currently sent: `invite`, `occurrence_reminder`, `room_reminder`.

What is not yet proven/complete:

1. Full credentialed scheduler operations in production-like environment.
2. Multi-device provider/runtime validation across Android/iOS.
3. Receipt polling/open-rate lifecycle.

Reference: `mobile/docs/release/notification-delivery-readiness.md`.

## 7) Moderation And Trust Readiness

Status: user-facing safety baseline is implemented; operator maturity is still minimal.

Ready now:

1. Report entry points on circle/invite/live/profile-related surfaces.
2. Block/unblock flows and persistence.
3. Account deletion request initiation and status model.

Remaining risk:

1. Internal moderation operations remain lightweight; support fallback and triage discipline must be run operationally.

## 8) Required Manual Credentials, Secrets, And Build Steps

Before serious beta/store submission, configure and validate:

1. Android signing secrets (`EGREGOR_UPLOAD_*` or supported equivalents).
2. `EXPO_PUBLIC_SENTRY_DSN`.
3. `SUPABASE_URL`.
4. `SUPABASE_SERVICE_ROLE_KEY`.
5. `NOTIFICATION_DISPATCH_SHARED_SECRET`.
6. Optional `EXPO_ACCESS_TOKEN` for Expo push authorization.

Minimum execution steps:

1. Run `npm --prefix mobile run typecheck`.
2. Run `npm --prefix mobile run test:release-baseline`.
3. Produce Android release build with real signing secrets.
4. Deploy/schedule dispatch worker and validate queue transitions + delivered pushes.
5. Complete iOS manual capability/signing/device validation.

## 9) Final Go/No-Go Criteria

Go only if all are true:

1. Android signed release artifact produced with real credentials and verified signature.
2. iOS signing/capability/push checks completed on physical devices.
3. Push dispatch worker deployed with secrets, scheduler cadence, and successful end-to-end delivery evidence for supported categories.
4. Crash + analytics ingestion verified in release candidate builds.
5. Privacy/support/deletion mappings verified in runtime and store forms.
6. Final manual QA and trust/safety checks completed without critical failures.

No-go if any of the following remains open:

1. Missing real signing credentials/build evidence.
2. Missing iOS entitlement/capability validation.
3. Push readiness claimed without deployed credentialed dispatch validation.
4. Store privacy/compliance forms not reconciled with actual app behavior.
