---
name: performance-accessibility
description: "Use when improving Egregor mobile performance, safe-area handling, readability, reduced-motion behavior, low-end device resilience, or accessibility quality across cinematic surfaces. Do not use for store copy, SEO, or backend-only work."
---

# Mission

Protect product quality on real devices, including low-end Android, screen readers, reduced-motion users, and cramped layouts.

## Read First

- `AGENTS.md`
- `mobile/docs/qa-redesign-checklist.md`
- `mobile/docs/DESIGN_SYSTEM.md`
- `mobile/src/features/rooms/hooks/useReducedMotion.ts`
- `mobile/src/features/rooms/hooks/useRoomAtmosphereQuality.ts`
- `mobile/src/components/Screen.tsx`
- target screen and component files

## Quality Standard

- Accessibility is a product requirement, not polish.
- Safe areas and readability come before atmospheric density.
- Large text, screen reader order, touch targets, and contrast must survive design refinements.
- Reduced motion must preserve meaning while lowering ornamental motion.

## High-Risk Surfaces

- `SoloLiveScreen`
- `EventRoomScreen`
- `EventsScreen` globe interactions
- profile/settings panels with dense controls
- any media-heavy or gradient-heavy authored surface

## Review Checklist

- Is text readable over the background in all key states?
- Are primary actions still visible at small heights and narrow widths?
- Does reduced motion behave intentionally?
- Do screen readers get useful labels without duplicate noise?
- Does low-end Android fall back to calmer rendering instead of jank?

## Deliverables

- performance or accessibility fixes, or a ranked audit
- manual QA notes for the affected surface
- run at least:
  - `npm --prefix mobile run typecheck`
  - `npm --prefix mobile run ci:design-system` when screen visuals changed

Use the relevant sections of `mobile/docs/qa-redesign-checklist.md` to decide what manual validation is still required.
