# iOS Release Manual Checks (Phase 6A)

Date: 2026-03-08

## Current Repo Visibility

`mobile/ios` is not present in this workspace snapshot.

Because of that, iOS native signing/capability state cannot be fully verified from committed files in this phase.

## Required Manual iOS Checks Before Submission

1. Generate iOS native project (`expo prebuild` or EAS managed build path).
2. Confirm bundle identifier and team signing settings.
3. Confirm APNs entitlement and push capability are enabled.
4. Validate notification permission prompt and settings fallback on physical iOS devices.
5. Validate in-app account deletion entry path is reachable from Profile.
6. Validate support/privacy/terms/account-deletion links open correctly.
7. Validate Sentry DSN is configured in iOS release environment.
8. Confirm no microphone permission text is requested unless intentionally re-enabled in product scope.
9. Validate App Store privacy nutrition labels align with `web/app/privacy/page.tsx` claims.

## Manual Evidence To Capture

1. iOS build log showing release configuration.
2. TestFlight screenshot/video of:
- auth entry
- invite decision
- live details -> reminder -> room join
- report/block action
- account deletion request initiation
3. Notification permission and delivered push screenshots.

## Known Unknowns Remaining After Phase 6A

1. Native iOS entitlement diff is unresolved until iOS project is generated and inspected.
2. iOS push token/runtime delivery behavior still requires device validation.
3. App Store Connect metadata and review questionnaire completion is still manual.
