# EgregorV2 Figma Importer

This plugin/importer generates an editable Figma source file from the canonical staging package at:
- `mobile/docs/redesign/figma-handoff/staging/`

It is a source-file generation tool, not a redesign tool.

## What it builds
The plugin creates the canonical Figma pages:
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

It imports canonical screen/content coverage:
- 20 canonical active routes
- 62 prayer items
- 61 event template items
- 6 canonical series items

It excludes legacy routes/screens (PrayerCircle, EventsCircle, deprecated events/room and deprecated community circle deep-link routes).

## Folder contents
- `manifest.json`: Figma plugin manifest
- `src/code.js`: plugin runtime (validation + file generation)
- `src/ui.html`: plugin UI
- `scripts/validate-staging.mjs`: validates staging package integrity
- `scripts/build-bundle.mjs`: builds plugin import bundle JSON
- `scripts/staging-utils.mjs`: shared staging data loaders/parsers
- `dist/egregorv2-staging-bundle.json`: generated import bundle (create via script)

## Prerequisites
- Node.js 18+ (for validation and bundle scripts)
- Figma Desktop app (plugin development mode)

## 1) Validate staging package
From repo root:

```bash
cd tools/figma-importer
npm run validate
```

Expected checks:
- page count = 10
- canonical screen count = 20
- prayer count = 62
- event template count = 61
- canonical series count = 6
- no legacy routes in frame index

## 2) Build importer bundle

```bash
cd tools/figma-importer
npm run bundle
```

Output file:
- `tools/figma-importer/dist/egregorv2-staging-bundle.json`

## 3) Install plugin in Figma
1. Open Figma Desktop.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`
3. Select:
- `tools/figma-importer/manifest.json`
4. Open or create the target Figma file.
5. Run plugin:
- `Plugins` -> `Development` -> `EgregorV2 Staging Importer`

## 4) Run import inside Figma
1. In plugin UI, choose file:
- `tools/figma-importer/dist/egregorv2-staging-bundle.json`
2. Click `Validate bundle` (recommended).
3. Click `Dry run` (recommended).
4. Click `Build Figma file`.
5. Wait for completion log.

## Generated structure behavior
- Creates all 10 canonical pages from `figma-staging-manifest.json`.
- Builds editable frame hierarchies for canonical screen routes using `screen-frame-index.csv` and `active-screen-blueprints.json`.
- Builds editable text/content rows from prayer/event/series JSON data.
- Builds media placeholder layers named by `associatedImageSlot` and `asset-placement-index.csv` slots.
- Builds motion annotation/layer sections from `motion-layer-index.csv` and `motion-surfaces.json`.
- Builds state matrices from `state-library.json`, `copy-state-library.json`, and `state-copy-bindings.json`.

## Validation guidance after import
Verify in Figma:
- Exactly 10 canonical pages created.
- Screen coverage includes all 20 canonical routes.
- Prayer content library has 62 editable rows.
- Event/live content library has 61 template rows and 6 canonical series rows.
- Motion/background references include SoloLive, EventRoom, and Global Pulse structures with reduced-motion notes.

## Limitations
- No direct code-to-Figma component instance parity; components are generated as clean editable structures/placeholders.
- Runtime-only backend volatility (live production rows) is not fetched; importer uses canonical exported staging data only.
- Spatial polish (exact final layout refinement) may still need designer pass, but semantic structure/content/state coverage is generated.

## Data that cannot be represented 1:1 in static Figma
- Runtime audio playback behavior and live heartbeat mechanics.
- Full dynamic animation curves/physics (represented as layer separation + notes).
- Backend-side dynamic counts/presence that change in real time.
