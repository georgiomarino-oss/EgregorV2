# Account Deletion Compliance Audit (Store Pass)

Date: 2026-03-11  
Scope: Focused compliance and UX/backend alignment pass for Apple/Google account deletion requirements.

## 1. Current In-App State

Primary files inspected:
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/lib/api/accountDeletion.ts`
- `mobile/src/features/profile/services/accountTrustPresentation.ts`
- `mobile/src/app/navigation/RootNavigator.tsx`
- `mobile/src/app/navigation/types.ts`
- `mobile/src/lib/support.ts`

Observed behavior:
1. In-app deletion initiation already exists in `ProfileSettings` under an `Account deletion` section.
2. Deletion request is initiated in app via Supabase RPC (`create_account_deletion_request`) and status is fetched via `get_account_deletion_status`.
3. Status-aware rendering exists (no request/requested/acknowledged/in_review/completed/cancelled/rejected).
4. Duplicate active requests are blocked at UI level (`requestDisabled`) and backend level (idempotent active-request return).
5. Profile home already includes a discoverability path into settings (`Account deletion and support` quick action).
6. Confirmation modal exists before submission.

Strengths:
- Real deletion-request workflow (not fake deactivation).
- In-app initiation is present and functional.
- Status-aware and idempotent flow already established.

## 2. Current Web State

Primary files inspected:
- `web/app/account-deletion/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/support/page.tsx`
- `web/app/site-config.ts`

Observed behavior:
1. `/account-deletion` page exists and includes deletion instructions.
2. Page currently positions email support as a prominent method and includes fallback language implying in-app option may be absent.
3. Configured in-app path text in `site-config.ts` is outdated (`Profile -> Account -> Delete account`) and does not match canonical current architecture (`Profile -> Settings -> Account deletion`).
4. Privacy/support pages link correctly to account deletion but copy can be tightened to align exactly with in-app lifecycle language.

## 3. Current Backend Model

Primary artifacts inspected:
- `supabase/migrations/20260308140000_phase_5a_notifications_safety_privacy_deletion.sql`
- `supabase/tests/phase_5a_foundation.sql`

Observed model:
1. Table: `public.account_deletion_requests` with status lifecycle (`requested`, `acknowledged`, `in_review`, `completed`, `rejected`, `cancelled`).
2. Active-request uniqueness/indexing and idempotent initiation behavior are implemented.
3. RPC `create_account_deletion_request(...)`:
   - returns existing active request if present,
   - updates `profiles.account_state` to `deletion_requested`,
   - disables active notification device targets.
4. RPC `get_account_deletion_status()` returns latest request for signed-in user.
5. RLS policies restrict read/write appropriately; operator update path exists for manual/support workflows.

Assessment:
- Backend already meets core persistence/audit/idempotence/status requirements for a support-reviewed deletion process.

## 4. Compliance Gaps (Current)

1. In-app copy is accurate but not explicit enough on full deletion scope and legitimate retained-data categories.
2. In-app status UX does not clearly message duplicate-pending outcomes if a stale client attempts submission.
3. Web deletion page messaging is not fully aligned with the app-first flow and contains outdated/soft fallback phrasing.
4. `siteConfig.accountDeletionPath` text is stale and should reflect canonical navigation.
5. Cross-surface consistency (in-app panel, privacy page, support page, deletion page) needs tighter language alignment.

## 5. Required Changes For Store-Compliance Clarity

1. Tighten in-app `Account deletion` panel copy in Settings:
   - explicitly state this is full account deletion request,
   - state what data is removed,
   - state legitimate retention categories,
   - state support-reviewed timeline expectations,
   - surface pending/duplicate request state clearly.
2. Keep deletion easy to find in Settings and maintain discoverability from Profile quick links.
3. Update web `/account-deletion` page to align with in-app-first initiation and provide a real support request fallback without contradiction.
4. Update `web/app/site-config.ts` account-deletion path string to canonical nav path.
5. Align privacy/support/deletion wording so all surfaces describe the same lifecycle.
6. Add/update targeted tests for deletion status presentation and copy where practical.

## 6. Execution Notes

- This pass will not redesign navigation or trust architecture.
- This pass will not replace deletion with deactivation.
- This pass will reuse existing Supabase deletion lifecycle model unless a concrete backend gap is identified.
- Manual deletion fulfillment remains operator/support workflow, but initiation remains in-app and auditable.
