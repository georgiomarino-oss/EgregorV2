# Phase 4A Manual QA

Date: 2026-03-08  
Scope: Cinematic visual system + reusable premium primitives + section-aware navigation polish.

## 1) Build And Smoke

1. Run `npm --prefix mobile run typecheck`.
2. Run `npm --prefix mobile run test:phase3b-live`.
3. Launch app and verify auth to main tabs succeeds.

## 2) Bottom Nav Theming By Section

## 2.1 Route-to-theme integrity

1. `SoloTab` (`Home` label) uses solo nav treatment.
2. `CommunityTab` (`Circles` label) uses circles nav treatment.
3. `EventsTab` (`Live` label) uses live nav treatment.
4. `ProfileTab` uses profile nav treatment.

## 2.2 Transition quality

1. Switch tabs in sequence: Home -> Circles -> Live -> Profile -> Home.
2. Confirm nav background/light treatment crossfades smoothly.
3. Confirm no layout jump, tab height jump, or icon displacement.
4. Confirm no route-name regression and correct destinations still open.

## 2.3 Readability and interaction

1. Active icon/label clearly distinguished from inactive.
2. Label text remains readable against all section themes.
3. Hit targets remain usable and visually centered.

## 3) Hero/Card Premium Consistency

## 3.1 Hero panels

Check:

1. Solo hero (`SoloScreen`) uses cinematic hero shell and fallback art.
2. Circles hero (`CommunityScreen`) uses cinematic hero shell and fallback art.
3. Live hero (`EventsScreen`) uses cinematic hero shell and fallback art.
4. Profile hero (`ProfileScreen`) uses cinematic hero shell and fallback art.

## 3.2 Content cards

Check:

1. Prayer cards use premium prayer card primitive.
2. Live occurrence cards use premium live-event primitive.
3. Circle summary/invite cards use premium circle primitive.
4. Trust metrics panel uses premium profile/trust primitive.

## 3.3 Visual quality checks

1. No obvious flat block-color cards on updated surfaces.
2. No mismatched purple emphasis on Live/Circles surfaces.
3. Card edges, glows, and overlays feel coherent across sections.

## 4) Readability Under Glow/Light Treatments

1. Verify title/body/meta text remains readable in all updated hero/cards.
2. Verify status chips remain readable on cinematic cards.
3. Verify CTA copy remains readable with overlays and fallback media.
4. Verify no text overlaps art fallback icon/label in compact widths.

## 5) Reduced Motion Behavior

1. Enable OS Reduce Motion.
2. Verify room atmosphere effects downgrade to static/balanced behavior.
3. Verify no looping ornamental motion in static quality mode.
4. Verify transitions still communicate state without abrupt flashes.

## 6) Large Text And Basic Accessibility

1. Increase system font size (large and largest available).
2. Verify section headers and status chips still render and wrap cleanly.
3. Verify bottom-nav labels remain readable and not clipped.
4. Verify focus/pressed states remain perceivable.
5. Confirm screen-reader labels on tab buttons still match IA labels.

## 7) Live-Room Foundation Checks

1. `SoloLiveScreen` renders room backdrop + aura field together.
2. `EventRoomScreen` renders room backdrop + collective field together.
3. Header/script/controls remain readable over upgraded atmospherics.
4. No logic regressions in join/leave/share flows.

## 8) Performance Sanity (Heavy Surfaces)

1. On a lower-end Android device/emulator, verify no severe jank entering rooms.
2. Confirm quality degradation path reduces heavy atmosphere layers.
3. Confirm no frame hitch spikes when switching tabs rapidly.
4. Confirm no memory spike/crash when scrolling prayer/event card rails.

## 9) Regression Guardrails

1. Feed semantics unchanged (same sections and CTA routing behavior).
2. Deep-link semantics unchanged (`room/:id`, `live/occurrence/:id`, invite handling).
3. Auth handoff and room targeting unchanged.
4. Verified logic-heavy files still compile and pass phase3b logic tests.
