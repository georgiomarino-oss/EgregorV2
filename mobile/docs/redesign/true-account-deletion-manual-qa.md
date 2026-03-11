# True Account Deletion Manual QA

Date: 2026-03-11  
Scope: Validate true in-app account deletion end-to-end, including secure backend execution, sign-out handling, and web/policy consistency.

## Preconditions

1. Latest migrations applied, including:
   - `20260311201500_true_account_deletion.sql`
2. Edge function deployed/configured:
   - `delete-account`
3. Required edge env vars set server-side:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Signed-in test user account exists with representative app data.

## A) Discoverability

1. Open app -> `Profile`.
2. Tap settings cog.
3. Confirm `Account deletion` panel is visible in Settings.

Expected:
- Deletion remains easy to find in canonical path.

## B) Confirmation flow

1. Tap `Delete account permanently`.

Expected:
- Confirmation alert appears.
- Alert clearly states irreversible full deletion.
- Alert mentions limited legitimate retention categories.

## C) Successful deletion flow

1. Confirm deletion.

Expected:
- Loading state appears (`Deleting account...`).
- Backend deletion completes without fake request state.
- User is signed out immediately.
- App exits authenticated experience and shows unauthenticated entry.

## D) Duplicate submission handling

1. Trigger deletion and rapidly tap deletion action again.

Expected:
- Duplicate calls are blocked client-side while loading.
- Backend returns in-progress conflict if duplicate execution race occurs.
- UI does not create multiple execution artifacts.

## E) Failure handling

1. Simulate backend failure (for example missing server env in non-prod).

Expected:
- UI shows `Deletion issue` with actionable error text.
- No false success state.
- User remains signed in when deletion fails.

## F) Post-delete data verification (backend)

For deleted user ID, verify:
1. `auth.users` row removed (hard delete).
2. User-owned rows removed from key app tables.
3. `account_deletion_audit_logs` contains lifecycle row.
4. User-owned storage objects removed where owner mapping exists.
5. Retained categories (if any) are consistent with policy assumptions.

## G) Authorization boundaries

1. As `authenticated` user role, verify direct execution of `run_account_deletion_cleanup` is denied.
2. Verify edge function path is the only supported self-service execution path.

## H) Web resource consistency

1. Open `/account-deletion`.
2. Verify copy states in-app deletion is automated/immediate.
3. Verify fallback support flow for inaccessible accounts is clear.
4. Open `/privacy` and `/support`; confirm retention/deletion wording is consistent.

## I) Regression smoke

1. Profile and Settings still load in normal signed-in flow.
2. Sign out action still works.
3. Privacy/support/account-deletion links open.

Expected:
- Canonical navigation and trust surfaces remain stable.
