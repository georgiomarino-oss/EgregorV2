# Phase 5A Verification Report

Date: 2026-03-08  
Scope: Verification + minimal bug-fix pass for Phase 5A notifications/trust/privacy/deletion foundation.

## 1) Environment and Inputs

- Local Supabase CLI: `2.75.0`
- Local DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Reviewed artifacts:
  - `mobile/docs/redesign/phase-5a-foundation-note.md`
  - `mobile/docs/redesign/phase-5a-manual-qa.md`
  - `supabase/migrations/20260308140000_phase_5a_notifications_safety_privacy_deletion.sql`
  - `supabase/tests/phase_5a_foundation.sql`
  - `mobile/src/lib/api/notifications.ts`
  - `mobile/src/lib/api/privacy.ts`
  - `mobile/src/lib/api/safety.ts`
  - `mobile/src/lib/api/accountDeletion.ts`
  - `mobile/src/lib/notifications/registerDevicePushTarget.ts`
  - `mobile/src/app/navigation/AuthGate.tsx`
  - `mobile/src/lib/api/data.ts`
  - touched screens that call Phase 5A APIs

## 2) Migration Validation

### Initial result

- `supabase db reset --local` applied all migrations cleanly through `20260308140000`.

### Defects found during test execution

1. `register_device_push_target` failed in `phase_5a_foundation.sql` with:
   - `column reference "user_id" is ambiguous`
   - root cause: `RETURNS TABLE` output names colliding with `ON CONFLICT (...)` column inference in PL/pgSQL.

2. Operator moderation transition failed in `phase_5a_foundation.sql`:
   - `Only operators can update moderation reports.`
   - root cause: `has_operator_privileges()` relied on `auth.jwt()` only; SQL harness sets role metadata via `request.jwt.claim.*`.

### Fixes applied

- Added migration: `supabase/migrations/20260308143000_phase_5a_foundation_verification_fixes.sql`
  - created/attached `notification_subscriptions_uniqueness_key` constraint
  - replaced ambiguous upserts with `ON CONFLICT ON CONSTRAINT` in:
    - `register_device_push_target`
    - `update_notification_subscription`
    - `block_user`
  - hardened `has_operator_privileges()` to evaluate:
    - `request.jwt.claim.role`
    - `request.jwt.claim.app_metadata`
    - `auth.jwt()` role/app_metadata when available

### Post-fix migration result

- `supabase db reset --local` applied cleanly through `20260308143000`.

## 3) SQL/Test Execution Results

All required scripts now pass:

- `supabase/tests/phase_2a_circle_collaboration.sql` passed
- `supabase/tests/phase_2b_circle_invite_preview.sql` passed
- `supabase/tests/phase_3a_event_domain.sql` passed
- `supabase/tests/phase_3a_event_domain_idempotence.sql` passed
- `supabase/tests/phase_5a_foundation.sql` passed

Additional compile/regression checks:

- `mobile`: `npm run typecheck` passed
- `mobile`: `npm run test:phase3b-live` passed
- `mobile`: `npm run test:phase4b-visual` passed

## 4) Integrity Check Matrix

- Device push target registration/storage: pass
  - repeated registration of same installation remains one active row.
- Notification preference persistence/idempotence: pass
  - canonical `notification_subscriptions` upserts idempotently.
- Occurrence/room reminder targeting: pass
  - Phase 3A + Phase 5A tests confirm canonical reminder persistence and idempotence.
- Legacy reminder adapter compatibility: pass
  - canonical `event_reminder_preferences` remains synchronized (no canonical drift found).
- Block/unblock behavior: pass
  - self-block rejected; block record persisted; blocked pair invite/join constraints enforced.
- Report submission and access boundaries: pass
  - reporter visibility limited; non-operator cannot transition status; operator can transition + action log created.
- Privacy settings access/update boundaries: pass
  - own settings read/write only; presence/member visibility filters enforced in canonical list functions.
- Account deletion initiation/status: pass
  - idempotent active request behavior confirmed; profile state + device target disabling confirmed.
- Broad-access regression checks: pass
  - authenticated peer cannot read other users’ device targets, blocks, deletion requests, reports, queue rows.
- Anon access to auth-only functions: pass
  - anon execute denied for authenticated-only Phase 5A RPCs.
- `profiles` sensitive fields broad mutability: pass
  - authenticated update of `account_state` blocked by trigger.
- Invite queue payload leakage: pass
  - queue rows remain user-scoped under RLS for authenticated users.
- Self-report handling: intentional + pass
  - self-report is currently allowed by model and persists correctly.

## 5) Notification Behavior: Real vs Scaffolded

### Real now

- Device push target model is real and writable via `register_device_push_target`.
- Canonical notification preference model is real via `notification_subscriptions`.
- Canonical occurrence/room reminder preference targeting is real and idempotent.
- Invite notification enqueue path is real (`create_circle_invite` -> `enqueue_invite_notification` -> `notification_queue`).
- RLS protects device targets/subscriptions/queue reads to owning user context.

### Still scaffolded / not production-complete

- No production fanout worker/dispatcher is validated in this pass.
- Queue processing, retries, provider send orchestration, and delivery telemetry remain follow-up.
- Device-token acquisition still requires runtime device/emulator validation in Expo environments.

## 6) AuthGate Push Registration Assessment

Current behavior in `AuthGate.tsx`:

- On authenticated session, `registerCurrentDevicePushTarget()` runs automatically.
- That helper requests notification permission if not already granted.

Recommendation for Phase 5B:

- Move first-time permission prompt from auth/login gate to contextual UX (for example, when enabling reminders).
- Keep silent token refresh/registration in background only after permission is already granted.
- Rationale: lower login friction and align consent timing with explicit user intent.

## 7) Remaining Risks Before Phase 5B

1. Notification dispatch is queue-backed but not yet end-to-end production fanout.
2. Operator role-claim wiring should be re-validated in staging tokens from the real auth pipeline.
3. Self-report is allowed; Phase 5B UX should clarify/report copy for this intentional behavior.
4. Legacy clients that bypass canonical RPCs (direct table reads) may not reflect new trust/privacy semantics.

## 8) Verification Conclusion

Phase 5A foundation is verified as functional in local/dev after minimal fixes in `20260308143000`.  
Scope remained backend/domain foundation only; no Phase 5B UX integration was started.
