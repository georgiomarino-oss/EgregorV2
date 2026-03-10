# Design system - Figma Page Spec

## Canonical scope
- Objective: Recreate token/style foundations used by active canonical screens.
- Canonical routes included: N/A (system page).
- Legacy excluded: PrayerCircle, EventsCircle, deprecated events/room and community/*-circle deep links.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/design/design-token-reference.md`
- `mobile/src/theme/tokens.ts`
- `mobile/src/theme/figma-v2-reference.ts`
- `mobile/src/theme/sectionTheme.ts`
- `mobile/src/theme/sectionThemeMapping.ts`
- `mobile/docs/DESIGN_SYSTEM.md`

## Frame list
| Frame | Purpose | Token groups |
| --- | --- | --- |
| `DS/SectionThemes` | Theme mapping for Home/Solo, Circles, Live, Profile/Settings. | `sectionVisualThemes`, section mappings |
| `DS/ColorTokens` | Semantic + section color variables. | `colors`, `semanticState`, `statusChipPalette`, `liveStatePalette`, `invitationStatePalette`, `trustSafetyPalette` |
| `DS/Typography` | Typography hierarchy and named styles. | `typography`, `typographyHierarchy` |
| `DS/SpacingRadii` | Layout rhythm, spacing scale, corner scale. | `spacing`, `radii`, `compositionRhythm` |
| `DS/MotionTokens` | Timing/easing and reduced-motion aliases. | `motion`, `transitionMotion`, `signatureMoments` |
| `DS/SurfaceTreatments` | Section glass/surface/glow treatment references. | `soloSurface`, `communitySurface`, `eventsSurface`, `profileSurface`, `roomVisualFoundation`, `roomAtmosphere` |

## Component list
- Figma variable collections: `colors`, `spacing`, `radii`, `typography`, `motion`
- Figma styles: section surfaces, state chips, semantic states, trust/safety palettes

## Text/content assignment (editable)
- Keep token labels editable and identical to token names.
- Include editable route mapping labels:
- `SoloTab -> solo`
- `CommunityTab -> circles`
- `EventsTab -> live`
- `ProfileTab -> profile`

## Asset placement instructions
- Use rows filtered to page `Design system` from `mobile/docs/redesign/figma-handoff/staging/data/asset-placement-index.csv`.
- Required slots on this page:
- `brand.appIcon`
- `brand.favicon`
- `brand.splash`
- `shared.overlay.geometry`

## Motion-layer notes
- No page-specific motion layer stack beyond token references.
- Keep reduced-motion token guidance visible in `DS/MotionTokens`.
