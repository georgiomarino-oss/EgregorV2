# Home / Solo - Figma Page Spec

## Canonical scope
- Objective: Stage canonical solo journey surfaces and states.
- Canonical routes included: `SoloHome`, `PrayerLibrary`, `SoloSetup`, `SoloLive`.
- Legacy excluded: PrayerCircle-era paths and retired pseudo-room variants.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/active-screen-blueprints.json`
- `mobile/docs/redesign/figma-handoff/staging/data/prayer-content-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/prayer-content-library.csv`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`
- `mobile/src/screens/SoloScreen.tsx`
- `mobile/src/screens/PrayerLibraryScreen.tsx`
- `mobile/src/screens/SoloSetupScreen.tsx`
- `mobile/src/screens/SoloLiveScreen.tsx`

## Frame list
| Route | Frame set | Required state frames | Key child components |
| --- | --- | --- | --- |
| `SoloHome` | `Screen/SoloHome/Default` | `loading_prayers`, `error`, `filtered_empty` | SoloHero, SoloCategoryChips, SoloSection, PrayerCard |
| `PrayerLibrary` | `Screen/PrayerLibrary/Default` | `loading`, `error`, `no_public_prayers` | SoloHero, library list rows, Start selected prayer action panel |
| `SoloSetup` | `Screen/SoloSetup/Default` | `loading_setup`, `setup_error` | SoloSetupHero, SetupSummaryPanel, Start session panel |
| `SoloLive` | `Screen/SoloLive/Default` | `loading_script_audio`, `shared_host`, `shared_participant`, `playback_error` | RoomAtmosphereBackdrop, SoloAuraField, RoomScriptPanel, RoomTransportControls |

## Component list
- SoloHero
- SoloCategoryChips
- SoloSection
- PrayerCard
- SoloSetupHero
- SetupSummaryPanel
- RoomAtmosphereBackdrop
- SoloAuraField
- RoomScriptPanel
- RoomTransportControls

## Text/content assignment (editable)
- Populate prayer rails and prayer library rows from `prayer-content-library.csv`/`.json`.
- Required fields: `stableKey`, `title`, `subtitle`, `description`, `categoryTheme`, `durationMinutes`, `appCtaLabel`, `associatedImageSlot`, `artDirectionNote`, `tone`.
- Keep setup and live header text bound to selected prayer metadata (no lorem replacement).
- Keep all state labels as editable text layers.

## Asset placement instructions
- Use rows filtered to page `Home / Solo` in `asset-placement-index.csv`.
- Required slots:
- `solo.hero.home`
- `solo.hero.setup`
- `solo.card.default`
- `solo.card.manifestation`
- `room.solo.overlay`
- `ambient.lottie.cosmic`

## Motion-layer notes
- SoloLive must preserve non-flattened layers:
- background veil gradient
- hero gradient
- `room.solo.overlay`
- SoloAuraField layers (core aura, veil, inner glow, sync overlay/host beacon)
- content layer
- controls overlay
- Reduced motion: switch to balanced/static without removing state labels or readability scrim.
