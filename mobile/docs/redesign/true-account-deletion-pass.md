# True Account Deletion Pass

Date: 2026-03-11  
Scope: Replace request-style account deletion with true in-app account deletion backed by secure server-side execution.

## Summary

EgregorV2 now supports true in-app account deletion from the canonical path:
- `Profile -> Settings -> Account deletion`

Deletion is executed by a secure Supabase Edge Function (`delete-account`) using server-only credentials. The mobile client no longer uses request-status RPCs to initiate deletion.

## What Changed

## 1) Secure backend deletion path

Added migration:
- `supabase/migrations/20260311201500_true_account_deletion.sql`

Added edge function:
- `supabase/functions/delete-account/index.ts`

Configured edge function JWT enforcement:
- `supabase/config.toml` (`[functions.delete-account] verify_jwt = true`)

### Backend behavior

`delete-account` now:
1. Verifies authenticated user via bearer token.
2. Requires explicit confirmation payload (`confirmPermanentDeletion=true`, `confirmationText='DELETE'`).
3. Writes auditable deletion lifecycle rows to `account_deletion_audit_logs`.
4. Calls server-only cleanup function `run_account_deletion_cleanup(uuid)`.
5. Removes owned storage objects where owner mapping exists in `storage.objects`.
6. Hard-deletes auth user via Supabase Admin (`auth.admin.deleteUser(..., false)`).
7. Returns clear success/failure responses.

### Idempotence / duplicate safety

- Existing `started` audit row -> returns in-progress conflict.
- Existing `completed` audit row -> returns already-deleted success payload.
- Audit row is marked `failed` if execution fails mid-flow.

## 2) Data cleanup model

Server cleanup function now deletes user-owned relational rows across key tables before auth deletion, including journal, reminders, notification targets/subscriptions/queue, privacy settings, blocks, room participation, shared solo participation/hosts, subscriptions, intentions, legacy events, circles, profile, and prior deletion request rows.

Also deletes user-owned created content rows where applicable (`event_library_items`, `prayer_library_items`, `event_series`, etc.).

## 3) In-app UX switched from request to true deletion

Updated mobile:
- `mobile/src/lib/api/accountDeletion.ts`
- `mobile/src/screens/ProfileScreen.tsx`

Behavior now:
1. User taps `Delete account permanently` in Settings.
2. Confirmation alert clearly states irreversible deletion.
3. App calls `delete-account` edge function.
4. On success, app signs user out immediately (`supabase.auth.signOut({ scope: 'local' })`, fallback to standard sign out).
5. User exits authenticated experience right away.

This replaces request-style status tracking in the active UI flow.

## 4) Web/privacy/support alignment

Updated:
- `web/app/account-deletion/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/support/page.tsx`

Alignment updates:
- In-app deletion described as automated/immediate.
- Web support path described as fallback for inaccessible accounts.
- Retained-data language aligned across pages.

## 5) Data retained intentionally

Not all records are blindly hard-deleted. Some records are intentionally retained where justified and user links are removed where schema enforces `SET NULL`, including categories such as:
- legal/compliance and billing obligations
- fraud/security/moderation audit needs
- operational analytics retained in de-identified form

Retention summary is encoded in backend response/audit flow and reflected in app/web copy.

## 6) Auth deletion type

Auth deletion is hard delete:
- `supabase.auth.admin.deleteUser(userId, false)`

## 7) Exact user/reviewer path

In app:
1. Open `Profile` tab.
2. Open settings cog.
3. Open `Account deletion` section.
4. Tap `Delete account permanently`.
5. Confirm deletion.

Web compliance resource:
- `/account-deletion`
- `https://egregor.world/account-deletion`

## 8) Remaining manual ops steps

No manual ops are required for standard in-app deletion success path.

Manual support operations still apply only for users who cannot access the app and submit deletion through web/support channels.
