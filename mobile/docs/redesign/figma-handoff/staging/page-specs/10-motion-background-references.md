# Motion/background references - Figma Page Spec

## Canonical scope
- Objective: Provide non-flattened motion and atmosphere layer references for redesign-safe motion work.
- Canonical surfaces included: SoloLive atmosphere, EventRoom atmosphere, Global Pulse (inline/fullscreen), hero/card transitions.
- Legacy excluded: old pseudo-room backdrops and retired pulse variants.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/motion-surfaces.json`
- `mobile/docs/redesign/figma-handoff/staging/data/motion-layer-index.csv`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`
- `mobile/src/screens/SoloLiveScreen.tsx`
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/features/events/components/EmbeddedGlobeCard.tsx`

## Frame list
| Frame | Surface |
| --- | --- |
| `Motion/SoloLiveAtmosphere` | Solo live room atmosphere layer stack |
| `Motion/EventRoomAtmosphere` | Event live room atmosphere layer stack |
| `Motion/GlobalPulseInline` | Inline global pulse globe layer stack |
| `Motion/GlobalPulseFullscreen` | Fullscreen global pulse globe layer stack |
| `Motion/HeroCardTransitions` | Hero/card transition references with reduced-motion variant |

## Component list
- RoomAtmosphereBackdrop layer groups
- SoloAuraField layer groups
- CollectiveEnergyField layer groups
- EmbeddedGlobeCard layer groups
- Motion annotation labels/tags

## Text/content assignment (editable)
- Keep annotation labels editable for each layer and motion role.
- Add tags for:
- decorative vs atmospheric vs state-signaling
- reduced-motion expectation
- interaction-critical layers vs replaceable visual layers

## Asset placement instructions
- Use rows filtered to page `Motion/background references` in `asset-placement-index.csv`.
- Required slots:
- `room.solo.overlay`
- `room.live.overlay`
- `live.globe.fallback`
- `ambient.lottie.cosmic`
- `shared.overlay.geometry`

## Motion-layer notes
- SoloLive layers: background veil -> hero gradient -> room.solo.overlay -> SoloAuraField sublayers -> content -> controls.
- EventRoom layers: background veil -> hero gradient -> room.live.overlay -> CollectiveEnergyField sublayers -> state chips/banners -> script/controls.
- Global Pulse layers: globe/map -> pulse rings -> accent rings -> legend/meta labels -> selection panel -> spotlight list.
- Reduced motion: remove loops/intense pulses first, keep hierarchy, readability, and state semantics intact.
