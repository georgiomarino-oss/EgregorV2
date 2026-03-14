---
name: ux-ui-redesign
description: "Use when redesigning or refining Egregor mobile screens, components, states, or interaction copy inside the canonical Home/Circles/Live/Profile architecture while preserving current product logic, deep links, trust flows, and token-based styling. Do not use for store listing work, SEO-only work, backend schema changes, or release-only QA."
---

# Mission

Refine the mobile product experience without breaking the canonical app model, deleted-legacy decisions, or store/compliance-sensitive flows.

## Read First

- `AGENTS.md`
- `mobile/docs/redesign/commercial-grade-master-plan.md`
- `mobile/docs/redesign/information-architecture-and-user-journeys.md`
- `mobile/docs/redesign/ux-ui-creative-direction.md`
- `mobile/docs/DESIGN_SYSTEM.md`
- `mobile/src/app/navigation/RootNavigator.tsx`
- the target screen and feature files under `mobile/src/screens` and `mobile/src/features`

## Treat These As Fixed Guardrails

- Keep the top-level sections as `Home`, `Circles`, `Live`, and `Profile`.
- Preserve current route keys until a task explicitly includes route-key migration.
- Preserve canonical deep-link targets and auth-gated handoff behavior.
- Keep trust-critical actions obvious:
  - invite status
  - reminder status
  - report/block
  - privacy controls
  - account deletion
- Do not reintroduce removed legacy flows such as `PrayerCircle`, `EventsCircle`, or deprecated `events/room` links.

## Work Inside The Existing Design System

- Import tokens from `mobile/src/theme/tokens.ts`.
- Reuse shared primitives and section-aware surfaces before creating one-off shells.
- Respect `mobile/docs/DESIGN_SYSTEM.md`, including the no-screen-hex rule.
- Preserve the premium cinematic tone, but keep hierarchy and readability ahead of atmosphere.

## Screen Architecture Expectations

- `SoloScreen` is the current Home/Solo entry and should stay fast to scan and easy to start from.
- `CommunityScreen` is the canonical Circles surface and must keep invite and membership states explicit.
- `EventsScreen`, `EventDetailsScreen`, and `EventRoomScreen` are the canonical Live flow and must preserve occurrence-first semantics.
- `ProfileScreen` and `ProfileSettingsScreen` must keep support, privacy, reminders, safety, and deletion discoverable.

## Layout And Readability Rules

- Respect safe areas, bottom-tab insets, and keyboard interactions.
- Do not let cinematic backgrounds reduce control clarity or contrast.
- Keep primary CTAs and current-state labels visible without requiring motion or hover assumptions.
- Design empty, loading, and error states as first-class surfaces, not afterthoughts.

## Deliverables

- Update the target screen, component, or copy within the current product model.
- Note any new or changed states that need QA or Figma handoff updates.
- Run at least:
  - `npm --prefix mobile run typecheck`
  - `npm --prefix mobile run ci:design-system` when visual code changed

## Escalate Instead Of Improvising

- If the requested change would alter top-level IA, canonical room/invite semantics, or trust/compliance behavior, stop and make that dependency explicit before redesigning around it.
