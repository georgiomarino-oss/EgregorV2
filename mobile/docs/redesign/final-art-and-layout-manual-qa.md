# Final Art and Layout Manual QA

Date: 2026-03-09

## 1) Preflight

1. `npm --prefix mobile run typecheck`
2. `npm --prefix mobile run test:release-baseline`
3. `npm --prefix mobile run test:final-art-layout`
4. Optional asset refresh:
   - `$env:OPENAI_API_KEY="..."`
   - `npm --prefix mobile run assets:generate:cinematic`

## 2) Core visual verification

Verify each surface no longer defaults to dark placeholder icon-boxes:

1. Solo tab: hero and prayer cards show cinematic media.
2. Solo setup: hero shows cinematic media.
3. Live tab: feed hero and occurrence cards show cinematic media.
4. Event details: hero media present.
5. Event room: atmosphere backdrop includes overlay art.
6. Circles tab: hero and circle summary cards show media.
7. Circle details / invite composer / invite decision heroes show media.
8. Profile: trust hero and journal shell show media.
9. Profile settings: settings/account/deletion cards show cinematic media.

## 3) Fallback behavior checks

1. Temporarily edit `resolveCinematicArt` call site to an unmapped slot and confirm primitives still render with fallback gradient/icon shell.
2. Confirm app remains usable if a mapped image fails to load at runtime (no crash, readable text over surface).

## 4) Profile and settings flow checks

1. Profile tab shows top-right cog.
2. Tap cog opens `ProfileSettings`.
3. Settings top action returns to Profile.
4. Profile no longer contains full notifications/privacy/safety/deletion stack inline.
5. Account deletion remains discoverable:
   - quick-link path on Profile
   - full actionable section inside Settings

## 5) Safety-area and layout checks

On at least one notch device and one small-height Android device:

1. No header text or action icon clips into status bar.
2. Profile top row spacing is stable in portrait.
3. Event room and Solo room controls remain tappable and not clipped at top.
4. Scroll density in Profile is materially reduced versus prior long-form settings stack.

## 6) Copy/presentation sanity checks

1. Event room state description reads naturally and does not repeat "live room" awkwardly.
2. Trust hero impact metric does not show `-0%`.
3. Room/live terminology is consistent in primary CTAs and state labels.

## 7) Smoke paths to run manually

1. Auth -> Profile -> Settings -> back to Profile.
2. Solo home -> prayer card -> Solo live -> back.
3. Live feed -> event details -> event room -> back.
4. Circles -> circle details -> invite composer -> back.
5. Circles -> invite decision -> open circle path.

## 8) Known constraints for sign-off

1. OpenAI asset generation quality pass is dependent on `OPENAI_API_KEY`; without it, procedural outputs are intentionally used.
2. This pass does not alter canonical invite/room/deep-link semantics; failures there should be treated as regressions outside art/layout scope.
