---
name: motion-animation-direction
description: "Use when designing, reviewing, or implementing Egregor motion systems such as room atmospheres, breathing backgrounds, hero transitions, globe pulse behavior, micro-interactions, or reduced-motion handling on mobile surfaces. Do not use for static layout-only redesigns, marketing copy work, or store listing tasks."
---

# Mission

Shape motion so it strengthens atmosphere, state clarity, and perceived quality without hurting readability, accessibility, or low-end device behavior.

## Read First

- `AGENTS.md`
- `mobile/docs/redesign/ux-ui-creative-direction.md`
- `mobile/docs/redesign/figma-handoff/motion/motion-surfaces.json`
- `mobile/src/features/rooms/hooks/useReducedMotion.ts`
- `mobile/src/features/rooms/hooks/useRoomAtmosphereQuality.ts`
- `mobile/src/features/rooms/components/RoomAtmosphereBackdrop.tsx`
- `mobile/src/features/rooms/components/SoloAuraField.tsx`
- `mobile/src/features/rooms/components/CollectiveEnergyField.tsx`
- `mobile/src/screens/SoloLiveScreen.tsx`
- `mobile/src/screens/EventRoomScreen.tsx`

## Surface Priorities

- `SoloLiveScreen`: breathing solo sanctuary, shared-host, and shared-participant states
- `EventRoomScreen`: collective energy, live/waiting/ended signaling, and reminder-state clarity
- `EventsScreen` globe surfaces: inline and fullscreen Global Pulse states
- hero and card transitions: atmosphere without semantic drift

## Required Motion Rules

- Make motion communicate state, depth, or focus, not generic polish.
- Preserve layer order from the motion handoff package.
- Keep script text and controls readable above every animated layer.
- Respect reduced motion at the system level, not as an afterthought.
- Use `useRoomAtmosphereQuality()` behavior as the baseline for `full`, `balanced`, and `static` modes.

## Reduced-Motion Expectations

- In reduced motion, keep labels, chips, and current-state signals intact.
- Turn loops into static or near-static alternatives where the docs call for it.
- Do not remove functional feedback that users need to understand room state.

## Performance Constraints

- Budget carefully for long-running loops on low-end Android.
- Avoid stacked animated effects that compete with audio controls or text highlighting.
- Test background/resume behavior for room surfaces when timing or sync is involved.
- Prefer calmer, fewer layers over adding more particles or orbit systems.

## Review Checklist

- Is the motion stateful and intentional?
- Can the user still read the surface at a glance?
- Does reduced-motion mode preserve meaning?
- Does low-end Android fall back gracefully?
- Does the motion stay inside the canonical surface identity for Solo, Live, or Global Pulse?

## Deliverables

- Provide a motion plan, implementation, or review notes tied to a specific surface.
- Update Figma handoff motion notes when motion semantics materially change.
- Run at least:
  - `npm --prefix mobile run typecheck`
  - the relevant manual QA slices from `mobile/docs/qa-redesign-checklist.md`
