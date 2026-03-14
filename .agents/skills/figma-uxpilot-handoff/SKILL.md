---
name: figma-uxpilot-handoff
description: "Use when exporting, staging, validating, or updating Egregor Figma or UXPilot handoff materials, including canonical screens, content libraries, motion references, asset mappings, and importer bundles. Do not use for freeform redesign work, non-canonical exports, or legacy route recreation."
---

# Mission

Keep the Figma and UXPilot handoff package synchronized with the canonical app that exists in this repo.

## Read First

- `AGENTS.md`
- `mobile/docs/redesign/figma-export-handoff.md`
- `mobile/docs/redesign/figma-handoff/README.md`
- `mobile/docs/redesign/figma-handoff/staging/README.md`
- `mobile/docs/redesign/figma-content-mapping.md`
- `mobile/docs/redesign/figma-asset-mapping.md`
- `tools/figma-importer/README.md`

## Canonical Export Rules

- Export or stage canonical active screens only.
- Keep the required Figma page order exactly as documented.
- Preserve canonical naming for pages, frames, components, and states.
- Use the real content libraries from the repo. Do not swap in lorem ipsum.
- Keep motion/background annotations for SoloLive, EventRoom, and Global Pulse up to date.

## Explicitly Exclude

- removed `PrayerCircle` and `EventsCircle` flows
- deprecated `community/*circle` deep links
- deprecated `events/room` room-entry shape
- compatibility-only UX that is not part of the canonical current product

## Required Sources

- staging structure under `mobile/docs/redesign/figma-handoff/staging/`
- architecture JSON in `mobile/docs/redesign/figma-handoff/architecture/`
- content libraries in `mobile/docs/redesign/figma-handoff/content/`
- motion references in `mobile/docs/redesign/figma-handoff/motion/`
- importer tooling in `tools/figma-importer/`

## Workflow

1. Confirm the task touches a canonical screen, component, state, content library, or motion reference.
2. Update the relevant handoff source files first.
3. If staging data changed, validate the staging package.
4. If importer output changed, rebuild the importer bundle.
5. Call out any gaps that still require a manual designer pass instead of pretending the exporter can do more than it can.

## Validation

Run when staging or importer inputs change:

- `npm --prefix tools/figma-importer run validate`
- `npm --prefix tools/figma-importer run bundle`

## Deliverables

- updated handoff files, staging data, or importer assets
- a short note on what changed in the canonical design package
- any manual Figma/UXPilot follow-up still required
