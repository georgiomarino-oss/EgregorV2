# States - Figma Page Spec

## Canonical scope
- Objective: Centralize canonical state matrices and edge-case copy that materially changes layout/behavior.
- Canonical routes included: cross-route state library (Home/Solo, Circles, Live, Profile/Settings).
- Legacy excluded: removed state mappings for retired PrayerCircle/EventsCircle flows.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/state-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/copy-state-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/state-copy-bindings.json`
- `mobile/docs/redesign/figma-export-inventory.md`

## Frame list
| Frame | State set | Source |
| --- | --- | --- |
| `States/SharedBase` | loading, error, success, empty | `state-library.sharedStates.base` |
| `States/InviteLifecycle` | pending, accepted, declined, expired, revoked, invalid | `state-library.sharedStates.inviteActions`, `copy-state-library.inviteStatuses` |
| `States/ReminderPermission` | reminder saved/removed + permission states | `state-library.sharedStates.reminder`, `copy-state-library.notificationPermissionStates`, `copy-state-library.reminderStates` |
| `States/CirclesSegments` | my/shared/invites + empty variants | `state-library.circles` |
| `States/LiveOccurrence` | live, waiting_room, upcoming, ended | `state-library.live`, `copy-state-library.liveStatusLabels` |
| `States/ProfileSettings` | notification permission, deletion lifecycle, journal save states | `state-library.profile`, `copy-state-library.deletionStatuses` |

## Component list
- LoadingStateCard
- InlineErrorCard
- RetryPanel
- EmptyStateCard
- StatusChip variants
- AlertBanner
- ToastCard

## Text/content assignment (editable)
- Apply field-level copy bindings from `state-copy-bindings.json`.
- Keep all labels editable.
- Include canonical strings for:
- reminder saved
- permission denied
- no circles
- no invites
- waiting room
- live now
- ended
- deletion lifecycle statuses

## Asset placement instructions
- No dedicated raster asset placement required on this page.
- If sample media is needed for context, reference slot placeholders only (do not embed flattened screenshots).

## Motion-layer notes
- State transitions should be represented as variant transitions, not timeline-only clips.
- Include reduced-motion variant notes for chip pulses and banners.
