# Figma Staging File Structure

This package is the designer-ready intermediate source for building a canonical EgregorV2 Figma staging file from the completed handoff.

Direct write status:
- Direct React Native-to-Figma structural write is still not feasible in this environment.
- This staging package is the deterministic fallback for manual build or Figma automation.

Use this folder as entrypoint:
- `mobile/docs/redesign/figma-handoff/staging/figma-staging-manifest.json`

Required Figma pages (in order):
1. Design system
2. Components
3. Home / Solo
4. Circles
5. Live
6. Profile / Settings
7. States
8. Prayer content library
9. Event/live content library
10. Motion/background references

Included staging artifacts:
- `page-specs/*.md` (one file per required page)
- `data/screen-frame-index.csv` (default/state frame naming inventory)
- `data/component-index.csv` (component family index)
- `data/asset-placement-index.csv` (slot-to-page asset placement instructions)
- `data/motion-layer-index.csv` (layer-order annotations for motion surfaces)
- `data/state-copy-bindings.json` (state/copy mapping)
- `data/prayer-content-library.csv` and `.json` (full prayer library)
- `data/event-content-library.csv` and `.json` (full event template library)
- `data/canonical-event-series.csv` and `.json` (canonical live series)
- `data/copy-state-library.json` (canonical copy/state strings)

Rebuild workflow:
1. Create pages in the exact manifest order.
2. Apply each page spec (`page-specs/*.md`) for frame names, component structure, text assignment, asset placement, and motion notes.
3. Populate prayer/event libraries from CSV/JSON as editable text rows (not screenshots).
4. Bind media by `associatedImageSlot` and `asset-placement-index.csv`.
5. Exclude all legacy/retired routes listed in the manifest and page specs.
