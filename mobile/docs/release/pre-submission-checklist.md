# Pre-Submission Checklist (Phase 6A)

Date: 2026-03-08

## 1) Automated Baseline

Run from `mobile/`:

```bash
npm run typecheck
npm run test:release-baseline
```

Automated baseline currently includes:

1. canonical deep-link precedence and live section logic
2. live visual-state mapping
3. trust/account presentation helpers
4. notification dispatch retry/backoff policy helpers

## 2) Backend Migration Verification

1. `supabase db reset --local`
2. Verify Phase 6A migrations apply:
- `20260308170000_phase_6a_notification_dispatch_hardening.sql`
- `20260308173000_phase_6a_mobile_observability_analytics.sql`

## 3) Android Release Gate

Reference:
- `mobile/docs/release/android-native-source-of-truth.md`

1. Confirm release signing vars are supplied.
2. Confirm release build fails without signing vars.
3. Confirm release build does not use debug keystore.
4. Confirm permission manifest matches `mobile/docs/release/permissions-rationale.md`.

## 4) Notification Delivery Gate

1. Deploy `dispatch-notification-queue` function.
2. Set required secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_DISPATCH_SHARED_SECRET`
3. Run worker invocation smoke test and verify queue state transitions.
4. Validate delivery for:
- invite
- occurrence reminder
- room reminder

## 5) Observability Gate

1. Set `EXPO_PUBLIC_SENTRY_DSN` in release environment.
2. Build and run release candidate build.
3. Confirm at least one analytics event row is written to `mobile_analytics_events`.
4. Confirm release tags appear in crash provider for runtime sessions.

## 6) Trust/Compliance Gate

1. Verify report and block actions remain reachable.
2. Verify unblock actions from Profile safety panel.
3. Verify account deletion request initiation and status rendering.
4. Verify support/privacy/account-deletion links open correctly.

## 7) iOS Manual Gate (Required)

Follow:

- `mobile/docs/release/ios-release-manual-checks.md`

iOS is not fully verifiable from current repo snapshot without generated native project files.

## 8) Final Manual QA Slice

Use both:

1. `mobile/docs/qa-redesign-checklist.md`
2. `mobile/docs/redesign/phase-5b-manual-qa.md`

Plus Phase 6A additions:

1. notification permission contextual prompts
2. dispatch worker end-to-end queue state checks
3. crash SDK initialization in release environment
