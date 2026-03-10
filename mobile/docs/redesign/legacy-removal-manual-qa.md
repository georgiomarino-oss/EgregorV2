# Legacy Removal Manual QA

Date: 2026-03-10
Scope: verify canonical navigation and deep-link behavior after legacy surface removal.

## Preconditions

1. User is authenticated.
2. Canonical circle + invite + live occurrence data exists in backend.

## QA Checklist

### Navigation surface

1. Open app and verify bottom tabs are still Home / Circles / Live / Profile.
2. In Circles tab, verify available flows are:
- My Circles
- Shared With Me
- Pending Invites
3. Confirm there are no visible entry points to `PrayerCircle` or `EventsCircle` compatibility screens.

### Circles canonical flows

1. Open a circle from My Circles and verify `CircleDetails` loads.
2. From `CircleDetails`, open invite composer and send a test invite.
3. Open pending invite decision flow and accept/decline path still works.

### Live canonical flows

1. From Live tab, open a `Live now` item and verify `EventRoom` opens.
2. From Live tab, open an upcoming/waiting item and verify details -> room action works.
3. In room screen, verify share/copy invite still works when room/occurrence target is present.
4. Verify no user-facing errors mention deprecated room route semantics.

### Deep-link behavior

1. Open `egregorv2://room/{roomId}` and verify room opens.
2. Open `egregorv2://live/occurrence/{occurrenceId}` and verify details open.
3. Open `egregorv2://invite/{token}` and verify invite decision opens.
4. Open deprecated links and verify they do not route into old screens:
- `egregorv2://community/events-circle`
- `egregorv2://community/prayer-circle`
- `egregorv2://events/room?...`

### Profile/settings continuity

1. Open Profile -> Settings and verify notifications/privacy/safety/account actions still present.
2. Confirm account deletion initiation path remains discoverable and working.

### Regression checks

1. Invite deep link captured at auth gate still resolves correctly after sign-in.
2. Live detail -> join room flow still tracks and functions.
3. Solo invite/share flow still generates and shares a valid `egregorv2://solo/live?...` link.

## Expected Outcomes

1. No legacy circle compatibility screens are reachable.
2. No deprecated `events/room` invite links are generated.
3. Canonical room/occurrence/invite links remain functional.
4. Core canonical Circles/Live/Profile flows remain intact.

## Known intentionally retained item

1. Event-room backend fallback logic still exists in data layer for migration safety, but primary UX paths do not intentionally route to it.
