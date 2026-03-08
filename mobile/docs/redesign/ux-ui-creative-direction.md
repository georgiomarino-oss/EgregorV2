# UX/UI Creative Direction

Date: 2026-03-08

## 1) Product Experience Intent

The product should feel:

1. Premium: high-trust, editorial clarity, strong hierarchy.
2. Cinematic: immersive atmosphere with restrained, meaningful motion.
3. Spiritually resonant: sacred without being abstract or vague.
4. Collaborative: people-first signals and real shared presence.
5. Practical: fast comprehension, low-friction join and reminder flows.

## 2) Design-System Strategy (Reuse First)

Reuse and extend existing foundations, do not replace:

1. Token architecture in `mobile/src/theme/tokens.ts`.
2. Documented system in `mobile/docs/DESIGN_SYSTEM.md`.
3. Existing semantic theming and spacing/radius/shadow primitives.

Required extensions:

1. Add semantic tokens for live states: `state.live`, `state.upcoming`, `state.ended`, `state.alert`.
2. Add trust/safety token group: report/block/destructive states.
3. Add invitation status tokens: pending/accepted/declined/expired.
4. Add globally consistent motion tokens (duration/easing for room join and invite transitions).

## 3) Visual Language

## 3.1 Color and atmosphere

1. Use layered gradients and ambient texture to create depth, not flat surfaces.
2. Keep contrast commercial-grade and readable under bright and dark backgrounds.
3. Reserve luminous accent color for live spiritual moments and key CTAs.

## 3.2 Typography

1. Use a two-tier system:
   - expressive display family for spiritual headlines
   - highly legible UI sans for controls/body
2. Maintain consistent type scale tied to tokens; avoid ad hoc sizing.

## 3.3 Motion

1. Motion communicates state transitions, not decoration.
2. Key motion moments:
   - Home reveal: staggered insight cards
   - Join room: focused transition from card to shared space
   - Invite lifecycle: clear state morph (pending -> accepted/declined)
3. Respect reduced-motion settings.

## 4) Core Experience Surfaces

## 4.1 Home

1. Hero card: next joinable moment (time-localized).
2. Secondary rail: continue solo / resume shared solo.
3. Inbox panel: pending invites and "added to your circles".
4. Reflection panel: journal prompt tied to recent participation.

## 4.2 Circles

1. Default segment: My Circles with role/status badges.
2. Secondary segment: Discover circles with trust and moderation signals.
3. Dedicated Invites segment with explicit pending/expired/declined states.

## 4.3 Live

1. Timeline/list grouped by temporal relevance.
2. Event cards show category, intent, timezone-localized start, and reminder status.
3. Every join CTA implies canonical room persistence.

## 4.4 Room

1. Clear participant and presence state (who is here now, who joined recently).
2. Distinctive mode chips: solo/shared/circle/global.
3. Fast reporting/blocking affordances in participant actions.

## 4.5 Profile

1. Personal identity and privacy settings up front.
2. Reminders and event subscriptions as first-class controls.
3. Trust and safety section (report center, blocked users).
4. Account deletion flow in-app.

## 5) UX Standards For Commercial Readiness

1. No hidden critical actions:
   - invite status
   - reminder status
   - report/block
   - account deletion
2. Empty states must educate next action.
3. Error states must provide deterministic recovery steps.
4. Every spiritually themed surface should still pass utilitarian usability checks.

## 6) Accessibility And Globalization

1. Minimum text contrast and touch target standards across all tabs.
2. Screen-reader labels for all live state badges and invite actions.
3. Time rendering always localized with explicit timezone disclosure when global.
4. Copy avoids idioms that break globally; spiritual language remains inclusive.

## 7) Current Component Migration Guidance

| Existing Component/Pattern | Direction |
|---|---|
| `GlobalPulseHero` and `CommunityAlertFeed` in `CommunityScreen.tsx` | Recompose into Home hero and Circles insights rather than remove |
| `CircleEntryCards` | Reuse card shell; add membership and invite state badges |
| `EventsScreen` occurrence list | Keep list structure, swap to canonical persisted occurrence source |
| `EventRoomScreen` | Keep room shell, enforce canonical room identity and safety actions |
| `SoloLiveScreen` | Keep experiential core; surface from Home as primary continuity action |

## 8) Content And Tone

1. Voice should be calm, precise, and sincere.
2. Avoid mystical vagueness in functional flows (invites, reminders, moderation).
3. Ritual naming should be evocative but operationally clear ("11:11 Intention Reset", not ambiguous metaphors).
