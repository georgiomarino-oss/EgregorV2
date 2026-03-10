# Components - Figma Page Spec

## Canonical scope
- Objective: Build reusable component families used by active routes only.
- Canonical routes included: all active routes via shared component families.
- Legacy excluded: PrayerCircle/EventsCircle compatibility components and dead adapters.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/architecture/component-families.json`
- `mobile/docs/redesign/figma-handoff/architecture/active-screen-blueprints.json`
- `mobile/src/components/**`
- `mobile/src/features/**`

## Frame list
| Frame | Purpose | Canonical members |
| --- | --- | --- |
| `Components/NavigationShell` | App shell and tab structure primitives. | RootNavigator, MainTabs, BottomTabs, Screen |
| `Components/HeroSurfaces` | Hero layouts by section theme. | SoloHero, SoloSetupHero, CirclesHeroPanel, EventsHeader, EventDetailsHero, TrustHero |
| `Components/CardFamilies` | Primary cards and list rows. | PrayerCard, OccurrenceCard, CircleSummaryCard, CirclePendingInviteCard, CircleDetailMemberRow, CircleInviteRecordRow |
| `Components/StateFeedback` | Loading/empty/error/success chips and banners. | LoadingStateCard, InlineErrorCard, RetryPanel, EmptyStateCard, StatusChip, ToastCard, AlertBanner |
| `Components/GlobalPulse` | Inline/fullscreen globe structures. | EmbeddedGlobeCard, LegendChip, Fullscreen selection panel |
| `Components/RoomExperience` | Live room layer + controls components. | RoomAtmosphereBackdrop, SoloAuraField, CollectiveEnergyField, RoomScriptPanel, RoomTransportControls |
| `Components/SettingsSurfaces` | Settings/profile utility panels. | NotificationSettingsPanel, PrivacyPresencePanel, SafetySupportPanel, JournalPanel, TrustMetricsPanel |

## Component list
- Use the full component list from `mobile/docs/redesign/figma-handoff/staging/data/component-index.csv`.
- Keep component names canonical to support code/design mapping.

## Text/content assignment (editable)
- Keep component labels editable and sourced from `mobile/docs/redesign/figma-handoff/staging/data/copy-state-library.json`.
- Include editable status labels for invite/live/deletion/permission chips.
- Do not convert reusable labels to flattened vectors.

## Asset placement instructions
- Use rows filtered to page `Components` from `mobile/docs/redesign/figma-handoff/staging/data/asset-placement-index.csv`.
- At minimum include media slot placeholders for:
- `solo.card.default`
- `solo.card.manifestation`
- `live.card.default`
- `live.card.flagship1111`
- `circles.card.default`
- section hero slots and room overlays

## Motion-layer notes
- Include component-level motion annotations for:
- card stagger entry
- status chip transitions
- room control overlay settle
- global pulse legend transitions
