# Design System Guardrails

## Canonical Tokens
- Canonical token file: `mobile/src/theme/tokens.ts`
- Screen/component code must import design tokens from this file (and Figma recipes from `mobile/src/theme/figma-v2-reference.ts` / `mobile/src/theme/figmaV2Backgrounds.ts` when needed).
- Do not define ad-hoc colors in screens.

## CosmicBackground Variants
Use `CosmicBackground` variants exactly as follows:

- `auth`
  - `AuthScreen`
  - `MissingEnvScreen`
- `circles` (or `home` during legacy compatibility)
  - `CommunityScreen`
- `live` (or `events` during legacy compatibility)
  - `EventsScreen`
- `solo`
  - `SoloScreen`
  - `SoloSetupScreen`
  - `PrayerLibraryScreen`
  - `SoloLiveScreen`
- `eventRoom` or `events`
  - `EventDetailsScreen`
  - `EventRoomScreen`
- `profile`
  - `ProfileScreen`

## Cinematic Primitives
Use shared premium primitives for authored surfaces:

- `PremiumHeroPanel`: top-of-screen hero shells.
- `PremiumPrayerCardSurface`: solo prayer card shells.
- `PremiumLiveEventCardSurface`: live/event card shells.
- `PremiumCircleCardSurface`: circles and invite card shells.
- `PremiumProfileTrustCardSurface`: profile/trust card shells.

These primitives must be section-aware (`solo`, `circles`, `live`, `profile`) and should be preferred over one-off gradient cards.

## SurfaceCard Variants
Use `SurfaceCard` variants by intent:

- `default`: neutral fallback surface.
- `authForm`: auth form container.
- `homeStat`: primary stat/highlight card on home/community surfaces.
- `homeStatSmall`: compact stat tiles.
- `homeAlert`: compact informational/alert cards.
- `profileImpact`: profile impact summary card.
- `profileRow`: profile list row surface.
- `eventsPanel`: event details/list panel.
- `eventRoomCurrent`: **only** for the current-room card in `EventRoomScreen` (contains warm/gold recipe by design).

## Strict Color Rule
- No hardcoded colors in screens.
- Screens must use tokens/recipes only.
- Hex colors are blocked in `src/screens` by script:
  - `npm run check:no-screen-hex`
  - CI-friendly alias: `npm run ci:design-system`
