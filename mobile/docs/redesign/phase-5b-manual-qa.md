# Phase 5B Manual QA

Date: 2026-03-08  
Scope: UX/app integration for reminders, notifications permission state, trust/safety actions, privacy controls, support access, and in-app account-deletion initiation.

## Prerequisites

1. Phase 5A migrations are applied and verification SQL is passing.
2. App is running with an authenticated user.
3. Test with at least:
   - one second user in a shared circle
   - one live occurrence/room route that resolves.
4. Validate on at least one physical iOS/Android device for push permission behavior.

## 1) AuthGate Permission Behavior

1. Fresh install or cleared app permissions.
2. Sign in and wait for app shell/home to load.
3. Confirm no system push permission prompt appears automatically from auth bootstrap.
4. Confirm app remains stable and logged in.

Expected:
- No first-time push prompt is shown at login.
- Background registration only runs when permission is already granted.

## 2) Contextual Reminder Permission Prompt

1. Navigate to Event Details for a valid occurrence.
2. Tap `Save reminder` while permission is `undetermined`.
3. Confirm system permission prompt appears contextually.
4. Accept permission and verify reminder save succeeds.
5. Repeat with permission denied and confirm no new system prompt appears; user is guided to settings.

Expected:
- Permission prompt is action-triggered, not auth-triggered.
- Reminder preference can still be saved even when device permission is denied.
- Reminder status copy accurately reflects saved preference vs delivery constraints.

## 3) Event Room Reminder + Status UX

1. Open Event Room waiting state.
2. Toggle reminder on/off.
3. Validate status notice updates for:
   - granted permission
   - denied permission
   - unsupported environment.
4. Use status action (open settings or enable) where offered.

Expected:
- Toggle persists reminder preference.
- Status notice is always truthful and never guarantees delivery.
- Action button appears only when actionable.

## 4) Profile Notifications Settings

1. Open Profile -> Notifications panel.
2. Verify permission badge and detail text reflect actual device state.
3. Toggle categories:
   - Live reminders
   - Circle invites
   - Circle activity
4. Kill/reopen app and verify values reload correctly.

Expected:
- Category toggles persist to Phase 5A notification preference model.
- Permission actions (`Enable on this device`, `Open notification settings`) behave correctly.

## 5) Privacy & Presence Controls

1. Open Profile -> Privacy & Presence panel.
2. Change:
   - member list visibility
   - live presence visibility
   - circle invite requests
   - outside-circle invite allowance
3. Navigate away/back and verify state persistence.

Expected:
- Controls map 1:1 to persisted privacy settings.
- Copy remains plain-language and understandable.

## 6) Safety Actions (Report / Block)

1. Circle Details:
   - open member manage surface
   - report a member
   - block a member
2. Invite Decision:
   - submit `Report invite`.
3. Live surfaces:
   - Event Details -> `Report`
   - Event Room -> `Report live room`.
4. Profile -> Safety & Support:
   - verify blocked user appears
   - unblock user.

Expected:
- Report actions succeed with confirmation/error handling.
- Block/unblock lifecycle updates the blocked list in Profile.
- No admin-only lifecycle controls are exposed in user UX.

## 7) Account Deletion UX

1. Open Profile -> Account deletion panel.
2. Confirm status headline/badge render correctly when no request exists.
3. Tap `Request account deletion` and confirm the alert copy explains support-reviewed flow.
4. Submit request and verify panel status updates to active request.
5. Attempt to request again and verify duplicate confusion is prevented.

Expected:
- Flow is easy to find, sober, and transparent.
- Status is idempotent-aware (active request disables duplicate requests).
- Copy does not imply instant deletion.

## 8) Support/Policy Access

1. From Safety & Support panel, open Support and Privacy links.
2. From Account deletion panel, open Deletion policy and Support links.
3. Validate browser handoff works and app returns cleanly.

Expected:
- Support/policy routes are reachable from trust/account contexts.
- Failure to open links surfaces a clear error message in-app.

## 9) Regression Smoke

1. Run:
   - `npm run typecheck`
   - `npm run test:phase3b-live`
   - `npm run test:phase4b-visual`
   - `npm run test:phase5b-account-trust`
2. Validate Profile, Event Details, Event Room, Circle Details, and Invite Decision screens render without crashes.

Expected:
- No regression in canonical Live/Circles flows or cinematic system rendering.
