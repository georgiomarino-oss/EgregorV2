# Design Token Reference

Source of truth:
- `mobile/src/theme/tokens.ts`
- `mobile/src/theme/figma-v2-reference.ts`
- `mobile/src/theme/sectionTheme.ts`
- `mobile/src/theme/sectionThemeMapping.ts`
- `mobile/docs/DESIGN_SYSTEM.md`

## Section themes
- `solo` (Home/Solo surfaces)
- `circles`
- `live`
- `profile`

Route mappings:
- `SoloTab -> solo`
- `CommunityTab -> circles`
- `EventsTab -> live`
- `ProfileTab -> profile`

Background variant mappings:
- `solo -> solo`
- `home/circles -> circles`
- `live/events/eventRoom -> live`
- `profile -> profile`

## Core token groups
- `colors`
- `spacing`
- `radii`
- `typography`
- `motion`

## Surface/token families
- `soloSurface`
- `communitySurface`
- `eventsSurface`
- `profileSurface`
- `sectionVisualThemes`

## State systems
- `statusChipPalette`
- `semanticState`
- `liveStatePalette`
- `invitationStatePalette`
- `trustSafetyPalette`

## Typography and composition
- `typographyHierarchy`
- `compositionRhythm`

## Motion and atmosphere
- `transitionMotion`
- `roomVisualFoundation`
- `signatureMoments`
- `roomAtmosphere`

## Handoff note
Use these token names as Figma variable/style names when recreating the active design system pages.
