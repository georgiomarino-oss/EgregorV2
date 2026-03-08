# Phase 6A Verification Report

Date: 2026-03-08  
Scope: Verification + minimal bug-fix pass for Phase 6A release hardening (release config, permissions, dispatch reliability, observability, QA baseline, store-readiness docs).

## 1) What Was Verified

1. Release signing hardening and failure behavior.
2. Android merged-manifest permission footprint against documented rationale.
3. Notification delivery path implementation and guardrails:
- registration
- queue write path
- dispatch claim/reclaim behavior
- retry/backoff policy
- stale processing reclaim
- invalid token disable logic path
4. Observability wiring:
- crash init behavior with missing DSN
- analytics event instrumentation coverage and payload shape
5. Automated baseline and prior targeted regression tests.
6. SQL migration and ACL/RLS behavior for Phase 5A + Phase 6A.
7. Doc truthfulness and explicit iOS manual boundaries.

## 2) Commands And Results

Executed successfully:

1. `npm --prefix mobile run typecheck`
2. `npm --prefix mobile run test:release-baseline`
3. `npm --prefix mobile run test:phase3b-live`
4. `npm --prefix mobile run test:phase4b-visual`
5. `npm --prefix mobile run test:phase5b-account-trust`
6. `npm --prefix mobile run test:phase6a-dispatch`
7. `supabase db reset --local`
8. `supabase/tests/phase_3a_event_domain.sql` (via `docker exec ... psql`)
9. `supabase/tests/phase_5a_foundation.sql` (via `docker exec ... psql`)
10. Additional SQL verification for Phase 6A dispatch ACL/reclaim/RLS checks (ad-hoc script via `docker exec ... psql`)
11. `./gradlew assembleRelease` with no signing env -> expected hard fail
12. `./gradlew assembleRelease` with fake `EGREGOR_UPLOAD_*` env + missing keystore path -> expected keystore-not-found fail
13. `./gradlew :app:processDebugMainManifest --rerun-tasks`
14. `./gradlew :app:processReleaseMainManifest --rerun-tasks` (with temporary `TMP/TEMP`, signing env, `NODE_ENV=production`)

## 3) Bugs / Regressions Found

1. Release signing env mapping bug in `mobile/android/app/build.gradle`:
- `EGREGOR_UPLOAD_*` values were documented as supported but not read from environment variables.
- Impact: documented signing path was misleading; release could not be configured as documented.

2. Permission regression in merged manifests:
- Sensitive permissions were still present in merged output (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, legacy storage/media) due transitive declarations/merge behavior.
- Impact: permission footprint and docs were inaccurate for actual build artifacts.

## 4) Fixes Applied

1. Signing env fix (`mobile/android/app/build.gradle`):
- Added `EGREGOR_UPLOAD_*` environment keys to signing resolution.
- Verified expected failures:
  - missing signing env -> hard fail
  - invalid keystore path with signing env -> explicit keystore-not-found fail

2. Permission hardening fix (`mobile/android/app/build.gradle`):
- Added merged-manifest strip step on `processDebugMainManifest` and `processReleaseMainManifest` to remove blocked sensitive permissions deterministically.
- Added required-permission ensure step so `POST_NOTIFICATIONS` remains declared after merge hardening.
- Kept source manifest minimal (`mobile/android/app/src/main/AndroidManifest.xml`).
- Verified merged manifests now exclude:
  - `RECORD_AUDIO`
  - `SYSTEM_ALERT_WINDOW`
  - legacy storage/media permissions
  - `FOREGROUND_SERVICE_MICROPHONE`
- Verified merged manifests still include `POST_NOTIFICATIONS`.

3. Dispatch reliability test strengthening:
- Added Phase 6A test assertion for permanent Expo token/provider error set membership (`DeviceNotRegistered`, `InvalidProviderToken`) in `mobile/tests/phase6a-notification-dispatch.test.cts`.

4. Docs reconciled to reality:
- `mobile/docs/release/permissions-rationale.md`
- `mobile/docs/release/android-release-setup.md`

## 5) Integrity Check Outcomes

1. `dispatch-notification-queue` inappropriate access:
- `supabase/config.toml` keeps `verify_jwt = false`.
- Function enforces `x-egregor-dispatch-secret` and returns `401` when missing/invalid (static verification).
- Runtime endpoint smoke in this environment returned `404` without dedicated function-serve routing, so HTTP auth check was validated statically/code-level here.

2. Queue/device target broad readability:
- Verified with SQL: non-owner authenticated context cannot read owner `notification_device_targets` or `notification_queue` rows.

3. Dispatch ACL and reclaim behavior:
- Verified SQL privileges:
  - `authenticated` cannot execute `claim_notification_queue_batch` / `enqueue_due_occurrence_reminders`
  - `service_role` can execute both
- Verified claim behavior:
  - due `pending` rows claimed
  - stale `processing` rows reclaimed
  - attempts incremented correctly

4. Retry/backoff:
- Verified by passing Phase 6A dispatch policy tests.

5. Invalid token disable behavior:
- Verified implementation path in `dispatch-notification-queue`:
  - permanent Expo errors include `DeviceNotRegistered` + `InvalidProviderToken`
  - matching targets are disabled (`disabled_at` set)
- Verified permanent code coverage via test.

6. Crash init safety without DSN:
- `initializeCrashReporting()` no-ops when `EXPO_PUBLIC_SENTRY_DSN` is absent; startup remains safe.

7. Analytics payload sensitivity:
- Instrumentation reviewed: event payloads include operational IDs/state metadata, not raw emails/passwords/message bodies.
- RPC enforces bounded object payload and size checks.

8. AuthGate prompt behavior:
- Confirmed `registerCurrentDevicePushTarget({ requestPermission: false })`; no first-time permission ask at auth gate.

## 6) Critical Path Regression Recheck

1. Canonical invite/deep-link precedence: preserved (Phase 3B test pass).
2. Canonical live target/state classification: preserved (Phase 3B test pass).
3. Trust/account display logic: preserved (Phase 5B account-trust tests pass).
4. Reminder state presentation logic: preserved (Phase 5B account-trust tests pass).

## 7) Release Behavior Hardened Now

1. Release signing path no longer silently depends on debug signing behavior.
2. Signing failures are explicit and actionable.
3. Merged Android manifests are hardened against sensitive transitive permission reintroduction.
4. Dispatch queue claim/reclaim + retry policy baseline is verified and covered by tests.
5. Notification queue/device-target ACL and RLS boundaries are verified.
6. Crash/analytics wiring is present and safe when env config is absent.
7. Automated release baseline + targeted prior-phase tests are green.

## 8) What Still Needs Secret-Backed / Device Validation

1. Full production-signed release artifact validation with real upload keystore.
2. End-to-end push dispatch on real devices with valid provider credentials:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_DISPATCH_SHARED_SECRET`
- optional `EXPO_ACCESS_TOKEN`
3. Live validation of invalid Expo token disable outcomes using real provider error responses.
4. iOS native signing/capability checks and on-device push validation (manual, repo-limited).

## 9) Remaining Risks Before Final Launch-Candidate Pass

1. Runtime push delivery confidence still depends on credentialed environment + scheduler operations.
2. Release bundling in this environment required explicit `NODE_ENV=production` and isolated temp cache path; CI/EAS envs must ensure equivalent setup.
3. iOS remains manual-validation-heavy due native project visibility limits in this snapshot.

## 10) Verification Conclusion

Phase 6A hardening is materially stronger after this pass, with two concrete regressions fixed (signing env mapping and manifest permission leakage), required test/SQL gates passing, and docs reconciled to actual behavior.  
No product semantics from Phases 2-5 were reopened.

## 11) Durability Follow-Up

This verification pass validated local native outputs under `mobile/android`.  
Durability was completed in a follow-up by moving Android hardening source of truth into tracked Expo config/plugin files (see `mobile/docs/release/android-native-source-of-truth.md`).
