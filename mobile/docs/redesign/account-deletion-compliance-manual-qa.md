# Account Deletion Compliance Manual QA

Date: 2026-03-11  
Scope: Manual verification checklist for store-compliant account deletion initiation and aligned web resource behavior.

## Preconditions

1. Signed-in test account in mobile app.
2. No existing deletion request for baseline run (or reset to `cancelled`/`completed`).
3. Web deployment includes latest `account-deletion`, `privacy`, and `support` pages.

## A. Discoverability and Navigation

1. Open `Profile` tab.
2. Confirm top-right cog opens `Settings`.
3. Confirm Profile quick link `Open account deletion in settings` navigates to settings.
4. In Settings, confirm `Account deletion` panel is visible without hidden/deep navigation.

Expected:
- Deletion entry point is easy to find from Settings and discoverable from Profile.

## B. No Request Yet State

1. Ensure no active deletion request.
2. Open Settings -> Account deletion panel.

Expected:
- Status badge shows no active request.
- Copy clearly states full deletion request (not deactivation).
- Retention disclosure is present and plain language.
- Timeline/review expectation is shown.

## C. Confirmation State

1. Tap `Request full account deletion`.

Expected:
- Confirmation alert appears.
- Alert explains full deletion request, not deactivation.
- Alert explains support-reviewed/non-instant process.

## D. Successful Submission State

1. Confirm request in alert.

Expected:
- Submission completes without app crash.
- Status updates to `Requested` (or current active status).
- Informational success message appears.
- Request timestamp appears.
- Request action is disabled while active.

## E. Duplicate Pending Handling

1. With active request still present, try to request again (if action is reachable).

Expected:
- Duplicate active request is blocked.
- UI indicates request is already active/in progress.
- No duplicate pending row is created.

## F. Failure State

1. Simulate network failure or backend error during request.

Expected:
- Inline issue card appears (`Deletion request issue`).
- User can retry later.
- Existing status is preserved.

## G. Loading State

1. Enter settings with slower network.

Expected:
- Deletion panel shows loading status text while current status is fetched.

## H. Support/Web Link Failure State

1. Disable network and tap `Open account deletion page` and `Open support`.

Expected:
- App shows clear failure alert for link opening failures.
- No silent failure.

## I. Web Resource Consistency

1. Open `/account-deletion`.
2. Verify in-app path copy is `Profile -> Settings -> Account deletion`.
3. Verify web fallback request path is clear (`/support` topic `Account deletion` or support email).
4. Verify page states full deletion (not deactivation).
5. Verify retained-data categories are listed.
6. Verify support-reviewed timeline language is present.

## J. Privacy/Support Consistency

1. Open `/privacy` and `/support`.
2. Confirm deletion language/path aligns with app and account deletion page.
3. Confirm support form includes `Account deletion` topic.

## K. Backend Idempotence Spot Check (Optional)

1. Inspect `account_deletion_requests` rows for test user.
2. Trigger repeated request call from app.

Expected:
- Only one active request (`requested|acknowledged|in_review`) exists per user.
- Status lifecycle remains auditable.

## L. Regression Smoke

1. Verify Profile and Settings still load correctly.
2. Verify sign-out still works.
3. Verify existing support/privacy links still open when network is available.

Expected:
- Canonical navigation and trust surfaces remain intact.
