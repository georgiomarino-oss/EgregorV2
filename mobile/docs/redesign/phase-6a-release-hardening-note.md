# Phase 6A Release Hardening Note

Date: 2026-03-08  
Scope: Release hardening foundation for Android signing, permissions, push dispatch reliability, observability, QA automation baseline, and store-readiness documentation.

## 1) Current Risk Snapshot (From Prior Redesign Artifacts)

Primary release risks still open after Phases 3A-5B:

1. Android release build path still uses debug signing in `mobile/android/app/build.gradle`.
2. Android permission surface is broader than required for current behavior (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, legacy storage permissions in manifest output).
3. Notifications are real for:
   - device target registration
   - preference persistence
   - invite enqueue to `notification_queue`
   but dispatch/fanout/retry is still incomplete (queue persistence without validated send worker).
4. Crash reporting and release-level telemetry are not established in mobile runtime.
5. Funnel analytics events expected by release plan are not consistently instrumented in app code.
6. Automated tests exist for some high-risk pure logic, but release-hardening logic (dispatch/perms/observability glue) still lacks focused automated coverage.
7. Store-readiness docs/checklists exist in fragments (phase notes + web legal pages) but not as a consolidated release operator guide.

## 2) What Phase 6A Will Harden

This phase will implement an incremental, repo-consistent baseline:

1. Android release signing no longer falls back to debug signing.
2. Release signing inputs become explicit and validated at build-time.
3. Permission footprint is narrowed and rationale is documented.
4. Notification pipeline moves from queue-only toward actual dispatch:
   - claim pending jobs
   - send push payloads through provider integration
   - update send status
   - apply retry/backoff and terminal failure states
5. Reminder categories are wired into queueing/dispatch where practical without overbuilding.
6. Mobile observability baseline is added:
   - crash reporting
   - release tagging
   - key funnel analytics event tracking
7. Automated test baseline is extended for newly introduced high-risk pure logic.
8. Release/store-readiness docs are consolidated with explicit "ready vs manual" boundaries.

## 3) Explicit Non-Goals / Remaining Manual Or Unresolved Items

Phase 6A will not:

1. Rework product/domain semantics from Phases 2-5.
2. Claim guaranteed push delivery across all providers/stores/devices.
3. Add a full moderation operator console.
4. Remove all legacy compatibility paths.

Expected remaining manual/runtime items after this phase:

1. Production credential provisioning and rotation (Expo push credentials, crash provider DSN, release env wiring).
2. iOS-specific release checks if native iOS project files are absent or partially generated in repo state.
3. Device-level notification permission and delivery validation across OS versions.
4. App store submission metadata, screenshots, and policy declarations.

## 4) Notification Delivery Model Expected After Phase 6A

Target model after this phase:

1. Registration: real (`register_device_push_target`) with stored device targets.
2. Preferences: real (`notification_subscriptions` + reminder preference synchronization).
3. Queueing:
   - invite notifications queue on invite creation (existing behavior retained),
   - occurrence/room reminder queueing enabled through minimal scheduler-compatible function(s).
4. Dispatch:
   - worker/function consumes `notification_queue` pending jobs,
   - sends supported push jobs via provider path used by current stack,
   - writes status, attempts, errors, and processed timestamps,
   - retries transient failures with backoff, marks terminal failures honestly.

Truth boundary after implementation:

1. Queue + dispatch will be real for the implemented categories and provider path.
2. Delivery still depends on valid runtime credentials, active tokens, and provider acceptance.
3. Receipt-level/open-level analytics remains a follow-up unless explicitly implemented in this phase.

## 5) Compatibility Assumptions (Current Stack)

Assumed baseline for this phase:

1. Expo SDK ~55 / React Native 0.83 project with committed Android native folder.
2. EAS build pipeline remains in use for release candidates.
3. Supabase Postgres + Edge Functions continue as backend/worker substrate.
4. Existing Phase 3A-5B canonical schemas and RPC contracts remain authoritative.
5. Existing legal/support/account-deletion web endpoints remain unchanged and are referenced by mobile trust/account surfaces.

## 6) Durability Addendum (Post-Verification)

`mobile/android` is generated/untracked in this repo snapshot, so hardening must be source-controlled in Expo config/plugin inputs.

Durable source of truth now lives in:

1. `mobile/app.json` (`android.permissions`, `android.blockedPermissions`, plugin registration)
2. `mobile/plugins/withPhase6aAndroidHardening.js`
3. `mobile/docs/release/android-native-source-of-truth.md`
