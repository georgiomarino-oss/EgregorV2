# Figma Export Handoff

## Export outcome
- Direct Figma authentication is available in this environment.
- A direct React Native-to-Figma structural exporter is not available here.
- Available Figma write tools in-session are oriented to web capture/diagram generation, which cannot reliably preserve native RN navigation/component hierarchy and dynamic content semantics for this app.
- Therefore, this pass produced a complete **Figma-ready handoff package** in-repo with structured JSON/CSV/MD artifacts for deterministic recreation.

## What was exported directly
- Structured handoff package files generated under:
  - `mobile/docs/redesign/figma-handoff/`

## What could not be exported directly
- No automatic direct-write of all RN screens/components/states into editable Figma frames was possible.
- No automatic conversion of RN component instances to Figma component instances/variants.

## Figma-ready package to use
Use these files as import/rebuild sources:
- `mobile/docs/redesign/figma-export-inventory.md`
- `mobile/docs/redesign/figma-content-mapping.md`
- `mobile/docs/redesign/figma-asset-mapping.md`
- `mobile/docs/redesign/figma-handoff/README.md`
- `mobile/docs/redesign/figma-handoff/architecture/active-screen-blueprints.json`
- `mobile/docs/redesign/figma-handoff/architecture/active-flows.json`
- `mobile/docs/redesign/figma-handoff/architecture/component-families.json`
- `mobile/docs/redesign/figma-handoff/architecture/state-library.json`
- `mobile/docs/redesign/figma-handoff/content/prayer-content-library.json` and `.csv`
- `mobile/docs/redesign/figma-handoff/content/event-content-library.json` and `.csv`
- `mobile/docs/redesign/figma-handoff/content/canonical-event-series.json` and `.csv`
- `mobile/docs/redesign/figma-handoff/content/copy-state-library.json`
- `mobile/docs/redesign/figma-handoff/motion/motion-surfaces.json`
- `mobile/docs/redesign/figma-handoff/design/design-token-reference.md`
- `mobile/docs/redesign/figma-handoff/assets/asset-mapping.json`

## How to recreate in Figma
Recommended page order:
1. Cover / instructions
2. Design system / tokens / styles
3. Component library
4. Home / Solo screens
5. Circles screens
6. Live screens
7. Profile / Settings screens
8. States and edge cases
9. Prayer content library
10. Event/live content library
11. Motion / atmosphere references
12. Asset references

Recreation process:
1. Build page-level frame skeletons from `active-screen-blueprints.json` and `figma-export-inventory.md`.
2. Build reusable components from `component-families.json` and preserve canonical names.
3. Create variants from `state-library.json` and the state tables in `figma-export-inventory.md`.
4. Populate prayer and event content libraries from the CSV/JSON files (do not replace with lorem ipsum).
5. Wire image/media slots using `asset-mapping.json` and keep slot semantics intact.
6. Define styles/variables using token names from `design-token-reference.md`.
7. Build motion layer groups from `motion-surfaces.json` (background, atmosphere, pulse/particle, content, controls).
8. Validate navigation and flow coverage using `active-flows.json`.

## Limitations
- Runtime backend rows (live production occurrences/circles/journal rows) can change and were not fully dumped from this environment.
- Active content context is preserved via canonical in-repo sources and current catalogs/seeds/mappers.
- Legacy backend compatibility fallbacks still present in code were intentionally not exported as canonical UX.

## Verification checklist
- Only canonical active screens/routes exported: yes.
- Legacy removed screens/routes excluded: yes.
- Key current flows/states represented: yes.
- Motion-heavy surfaces represented structurally (not flattened only): yes.
- Profile + Settings split represented correctly: yes.
- Globe represented inline + fullscreen: yes.
- Exported copy/content sourced from current code/catalog files: yes.
- Prayer/event content libraries included for semantic card redesign: yes.

## Staging package
- Added designer-ready staging structure at mobile/docs/redesign/figma-handoff/staging/.
- Entry point: mobile/docs/redesign/figma-handoff/staging/README.md.
- Includes one page spec per required Figma page, frame/component/content/asset/motion indices, and canonical source snapshots for deterministic manual/automation reconstruction.
- Figma plugin/importer implementation added at tools/figma-importer/ for automated staging-package import into editable Figma pages/frames/content.
