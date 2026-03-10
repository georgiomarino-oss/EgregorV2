# Globe Reintroduction Pass

Date: 2026-03-09

## Scope

This pass reintroduces the interactive globe as a first-class Live surface without changing canonical room/occurrence product logic.

## Where The Globe Appears

1. Live tab (`mobile/src/screens/EventsScreen.tsx`), directly below `EventsHeader`.
2. Rendered via `EmbeddedGlobeCard` (`mobile/src/features/events/components/EmbeddedGlobeCard.tsx`).
3. Supports inline preview and immersive fullscreen modal from the same panel.

## Canonical Data Sources

1. Occurrence feed from `useEventsData` + `useOccurrenceFeed` (canonical `event_occurrences` / room-backed data).
2. Active presence summaries from `fetchActiveEventUsers` (occurrence-linked active participants).
3. Globe point mapping via `buildCanonicalGlobePointMaps` (`mobile/src/features/events/services/globeData.ts`).

## Truthfulness And Privacy Handling

1. Removed device geolocation from globe mapping (`expo-location` no longer used).
2. Removed location permission declarations from Expo config (`mobile/app.json`).
3. Participant visualization is now room-level activity clusters, not per-user pseudo-location dots.
4. Only canonical occurrences in the next 24-hour horizon are mapped.
5. Active presence rows that do not resolve to canonical occurrences are ignored.
6. UI copy explicitly states clusters are approximate and not precise participant geolocation.

## Interaction And CTA Paths

1. Tapping an inline globe hotspot opens the canonical occurrence path:
- `live` / `waiting_room` -> `EventRoom`
- `upcoming` -> `EventDetails`
2. Fullscreen globe supports:
- marker selection preview
- primary CTA to room/moment
- details CTA to canonical `EventDetails`
3. No synthetic legacy-only event targets are used by the Live-tab globe integration.

## Fallback Behavior

1. If Mapbox token/module is unavailable, the panel renders a premium fallback (Lottie + explanatory copy), not a blank card.
2. List-based Live feed remains fully usable in fallback mode.
3. Fullscreen affordance remains available from fallback panel.

## Tests Added

1. `mobile/tests/globe-canonical-data-mapping.test.cts`
- verifies 24-hour canonical filtering
- verifies room-level cluster behavior (no per-user marker fan-out)
2. `mobile/scripts/run-phase3b-live-tests.mjs` now runs both:
- `phase3b-live-model.test`
- `globe-canonical-data-mapping.test`

## Intentionally Deferred

1. True participant geospatial plotting is not implemented (no privacy-safe verified source currently exists).
2. Marker density scaling by participant count is deferred to avoid overbuilding before first serious release.
