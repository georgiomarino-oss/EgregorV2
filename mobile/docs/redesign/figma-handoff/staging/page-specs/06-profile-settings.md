# Profile / Settings - Figma Page Spec

## Canonical scope
- Objective: Stage profile overview plus settings subsections with trust/privacy/safety/account semantics.
- Canonical routes included: `ProfileHome`, `ProfileSettings`, `ProfileSettings#Notifications`, `ProfileSettings#PrivacyPresence`, `ProfileSettings#SafetySupport`, `ProfileSettings#AccountDeletion`, `ProfileHome#JournalTrustProgress`.
- Legacy excluded: removed compatibility settings routes and non-canonical profile variants.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/active-screen-blueprints.json`
- `mobile/docs/redesign/figma-handoff/staging/data/copy-state-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/features/profile/components/NotificationSettingsPanel.tsx`
- `mobile/src/features/profile/components/PrivacyPresencePanel.tsx`
- `mobile/src/features/profile/components/SafetySupportPanel.tsx`
- `mobile/src/features/profile/components/JournalPanel.tsx`

## Frame list
| Route | Frame set | Required state frames | Key child components |
| --- | --- | --- | --- |
| `ProfileHome` | `Screen/ProfileHome/Default` | `loading_profile`, `journal_sync_issue`, `profile_snapshot_pending` | TrustHero, TrustMetricsPanel, JournalPanel, settings summary card |
| `ProfileSettings` | `Screen/ProfileSettings/Default` | `settings_loading`, `permission_denied`, `updating_toggles`, `deletion_request_active` | NotificationSettingsPanel, PrivacyPresencePanel, SafetySupportPanel, account/deletion panels |
| `ProfileSettings#Notifications` | `Screen/ProfileSettings#Notifications/Default` | `permission_granted`, `permission_undetermined`, `permission_denied`, `permission_unsupported` | NotificationSettingsPanel rows, permission card, reminder card |
| `ProfileSettings#PrivacyPresence` | `Screen/ProfileSettings#PrivacyPresence/Default` | `member_visibility_variants`, `presence_visibility_variants`, `invite_request_on_off` | PrivacyPresencePanel segmented controls, invite toggle cards |
| `ProfileSettings#SafetySupport` | `Screen/ProfileSettings#SafetySupport/Default` | `loading_blocked_users`, `no_blocked_users`, `unblocking`, `error_info_message` | SafetySupportPanel blocked rows, support action row |
| `ProfileSettings#AccountDeletion` | `Screen/ProfileSettings#AccountDeletion/Default` | `no_request`, `requested`, `acknowledged`, `in_review`, `completed`, `cancelled`, `rejected` | deletion badge, request deletion action, policy/support actions |
| `ProfileHome#JournalTrustProgress` | `Screen/ProfileHome#JournalTrustProgress/Default` | `saved`, `saving`, `unsaved`, `entry_history_empty_draft` | JournalPanel, TrustHero, TrustMetricsPanel |

## Component list
- TrustHero
- TrustMetricsPanel
- JournalPanel
- NotificationSettingsPanel
- PrivacyPresencePanel
- SafetySupportPanel
- Account deletion panels
- Status chips and action rows

## Text/content assignment (editable)
- Notifications copy: `copy-state-library.json.notificationPermissionStates` and `reminderStates`.
- Privacy/presence summaries: `copy-state-library.json.privacySummaryExamples`.
- Safety messages: `copy-state-library.json.safetyActionFeedback`.
- Deletion lifecycle copy: `copy-state-library.json.deletionStatuses`.
- Preserve profile + settings split with top-right settings cog transition.

## Asset placement instructions
- Use rows filtered to page `Profile / Settings` in `asset-placement-index.csv`.
- Required slots:
- `profile.hero.trust`
- `profile.hero.settings`
- `profile.hero.ledger`
- `profile.card.journal`
- `ambient.lottie.cosmic`

## Motion-layer notes
- Preserve journal page-turn/save-pulse concepts as editable motion annotations.
- Preserve panel reveal/settle patterns for settings sections.
- Reduced motion: immediate transitions while retaining clear section boundaries.
