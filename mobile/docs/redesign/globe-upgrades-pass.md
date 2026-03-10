# Globe Upgrades Pass

Date: 2026-03-09

## Scope

This pass upgrades `Global Pulse` beyond reintroduction by adding:

1. canonical marker intensity scaling
2. richer visual state differentiation
3. a more immersive and actionable fullscreen experience

No canonical Live routing/deep-link/reminder semantics were changed.

## Implementation Summary

### 1) Marker scaling and canonical intensity

Updated data model:

1. `mobile/src/features/events/services/globeVisualState.ts`
2. `mobile/src/features/events/services/globeData.ts`
3. `mobile/src/features/events/hooks/useGlobePoints.ts`

Marker scale now comes from canonical signals only:

1. occurrence `startsCount` (canonical active participation signal)
2. active presence matched to canonical occurrence targets
3. small state boost for `live` and `waiting_room`

Scaling is bounded and bucketed for privacy and readability:

1. `calm`
2. `steady`
3. `vivid`
4. `radiant`

The map uses `marker_scale`, `intensity_bucket`, and `presence_bucket` properties from canonical point data.

### 2) Visual state differentiation

State mapping now distinguishes:

1. `live`
2. `waiting_room` / opening soon
3. `flagship`
4. `ritual_1111`
5. `upcoming`
6. `news` (kept as existing live-feed category support)

Rendering updates in `mobile/src/features/events/components/EmbeddedGlobeCard.tsx`:

1. Separate base layers for live, waiting, upcoming, news.
2. Accent aura layers for flagship and 11:11 nodes.
3. Intensity-aware ring/core opacity and radius expressions.
4. Cluster overlays with presence bucket scaling.
5. Reduced-motion behavior now suppresses continuous pulse/autospin intensity.

### 3) Expanded fullscreen globe mode

Fullscreen mode remains modal-based (no route churn) but is now more immersive/useful:

1. expanded legend with opening-soon, flagship, and 11:11 indicators
2. concise intensity explanation note
3. improved selection preview with:
- state + accent label
- intensity label (e.g., `Vivid pulse`)
4. `Join from the field` spotlight panel when nothing is selected:
- up to 3 canonical spotlight moments
- direct CTA into canonical occurrence paths

## Truthfulness and privacy

Preserved:

1. no device geolocation reads
2. no location permission usage
3. no synthetic pseudo-live activity
4. no precise participant coordinate claims

Clusters remain region/timezone-level approximations generated from canonical occurrence context and presence summaries.

## Files changed (globe upgrade scope)

1. `mobile/src/features/events/services/globeVisualState.ts` (new)
2. `mobile/src/features/events/services/globeData.ts`
3. `mobile/src/features/events/hooks/useGlobePoints.ts`
4. `mobile/src/features/events/components/EmbeddedGlobeCard.tsx`
5. `mobile/src/features/events/types.ts`
6. `mobile/src/features/events/utils/globe.ts`
7. `mobile/tests/globe-canonical-data-mapping.test.cts`
8. `mobile/tests/globe-no-location-permission-regression.test.cts` (new)
9. `mobile/scripts/run-phase3b-live-tests.mjs`

## Intentional deferrals

1. No precision geospatial heatmap (not privacy-safe with current verified model).
2. No dedicated navigation route for fullscreen globe (modal kept for minimal architecture churn).
3. No provider-level participant density telemetry beyond canonical room/presence signals.
