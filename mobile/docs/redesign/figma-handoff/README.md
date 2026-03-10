# Figma-Ready Handoff Package

This package contains structured exports from canonical active app sources.

## Included files
- `architecture/active-screen-blueprints.json`
- `architecture/active-flows.json`
- `architecture/component-families.json`
- `architecture/state-library.json`
- `motion/motion-surfaces.json`
- `design/design-token-reference.md`
- `content/prayer-content-library.json`
- `content/prayer-content-library.csv`
- `content/event-content-library.json`
- `content/event-content-library.csv`
- `content/canonical-event-series.json`
- `content/canonical-event-series.csv`
- `content/copy-state-library.json`
- `assets/asset-mapping.json`

## Primary source files
- Navigation: `mobile/src/app/navigation/*`
- Screens: `mobile/src/screens/*`
- Features/components: `mobile/src/features/*`, `mobile/src/components/*`
- Theme/tokens: `mobile/src/theme/*`
- Prayer catalog: `supabase/scripts/prayer-catalog.json`
- Event catalog: `mobile/src/lib/catalog/eventLibraryCatalog.ts`
- Canonical event series seeds: `supabase/migrations/20260308130000_phase_3a_canonical_event_domain.sql`
- Generated cinematic manifest: `mobile/assets/generated/asset-manifest.json`

## Recreation intent
Use these files to rebuild editable Figma pages without changing product IA, flow semantics, content semantics, or motion intent.
