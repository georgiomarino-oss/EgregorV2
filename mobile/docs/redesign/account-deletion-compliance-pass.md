# Account Deletion Compliance Pass

Date: 2026-03-11  
Scope: Store-compliance implementation pass for in-app account deletion initiation, web resource alignment, and lifecycle copy consistency.

## What Changed

## Mobile App (In-App Flow)

Updated files:
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/features/profile/services/accountTrustPresentation.ts`
- `mobile/tests/phase5b-account-trust-presentation.test.cts`

Changes:
1. Kept deletion entry in canonical location: `Profile -> Settings -> Account deletion`.
2. Kept Profile discoverability quick-link and renamed action to clearer copy: `Open account deletion in settings`.
3. Updated deletion confirmation dialog to explicitly state:
   - full account deletion request,
   - not deactivation,
   - support-reviewed flow,
   - possible legitimate retention categories.
4. Added explicit in-panel disclosure copy for:
   - full deletion scope,
   - retained data categories (legal, billing, fraud, security, audit),
   - review timeline target (7 business days after verification).
5. Added clear status context enhancements:
   - request created timestamp rendering,
   - informational messages for successful submit and duplicate-active detection.
6. Preserved failure handling with inline issue card and support/deletion link failure alert states.

## Web Resource Alignment

Updated files:
- `web/app/account-deletion/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/support/page.tsx`
- `web/app/site-config.ts`
- `web/app/site-content.ts`
- `web/app/support/contact-form.tsx`

Changes:
1. Updated canonical in-app path text in web config:
   - from `Profile -> Account -> Delete account`
   - to `Profile -> Settings -> Account deletion`.
2. Reworked `/account-deletion` page to align with app-first initiation:
   - in-app path is primary,
   - web support path is fallback when app access is unavailable,
   - deletion scope and retention disclosures match app language.
3. Added clearer support-page account deletion instructions and request path consistency.
4. Added `Account deletion` topic to support form topic set for explicit web request routing.
5. Tightened privacy-page deletion-rights copy to reference canonical in-app path and web fallback.

## Backend/Data Model

No schema/function change was required in this pass.

Why no backend migration:
1. Existing model already satisfies requirements:
   - persisted requests (`account_deletion_requests`),
   - auditable lifecycle statuses,
   - idempotent initiation (`create_account_deletion_request` returns active row),
   - status retrieval (`get_account_deletion_status`),
   - duplicate pending protection,
   - support/manual workflow compatibility.
2. This pass focused on compliance UX clarity and cross-surface consistency.

## Real Deletion Behavior (Current)

1. User initiates deletion request inside app from settings.
2. Request is persisted and status-aware.
3. Active duplicate request attempts are blocked/idempotent.
4. Workflow is support-reviewed, not instant.
5. Completion behavior remains full account deletion workflow, not deactivation.

## Retained-Data Disclosures Added/Aligned

Now consistently disclosed across app/web:
- Some records may be retained only for legitimate reasons such as legal/regulatory compliance, billing, fraud prevention, security, and audit obligations.

## Reviewer/User Path To Initiate In-App

1. Open app while signed in.
2. Go to `Profile` tab.
3. Open top-right settings cog or use Profile quick action.
4. Navigate to `Account deletion` section.
5. Tap `Request full account deletion` and confirm.

## Compliance Web Deletion Resource

Primary URL/path:
- `/account-deletion`

Production URL:
- `https://egregor.world/account-deletion`

## Manual Ops Notes (Support Fulfillment)

1. Support/operator team must continue processing lifecycle status transitions (`requested` -> `acknowledged` -> `in_review` -> `completed|rejected|cancelled`).
2. Identity verification remains a manual support step before final completion.
3. Deletion completion/retention enforcement remains governed by existing backend operator workflows.
