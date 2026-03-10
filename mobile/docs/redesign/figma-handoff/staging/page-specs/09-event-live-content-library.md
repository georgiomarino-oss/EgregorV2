# Event/live content library - Figma Page Spec

## Canonical scope
- Objective: Provide complete active live/event content context for semantic redesign.
- Canonical content included: 61 event template items + 6 canonical live series items.
- Legacy excluded: retired pseudo-event flows and non-canonical adapter content keys.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/event-content-library.csv`
- `mobile/docs/redesign/figma-handoff/staging/data/event-content-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/canonical-event-series.csv`
- `mobile/docs/redesign/figma-handoff/staging/data/canonical-event-series.json`
- `mobile/docs/redesign/figma-content-mapping.md`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`

## Frame list
| Frame | Purpose |
| --- | --- |
| `Library/Event/Overview` | Column legend and treatment legend (`collective live moment`, `11:11`, `flagship`). |
| `Library/Event/TemplateRows` | One editable row/card per template item (61 rows). |
| `Library/Event/CanonicalSeriesRows` | One editable row/card per canonical live series item (6 rows). |
| `Library/Event/<Category>` | Category-specific grouped rows for fast visual direction assignment. |

## Component list
- `EventContentRow` (editable data row)
- `OccurrenceCard` semantic preview (state chip + metadata + image slot)
- `CanonicalSeriesRow` (adds schedule/access metadata chips)

## Text/content assignment (editable)
- Required editable columns per template row:
- `stableKey`
- `title`
- `subtitle`
- `description`
- `categoryTheme`
- `durationMinutes`
- `treatment`
- `associatedImageSlot`
- `artDirectionNote`
- state CTA map (`live`, `waiting_room`, `upcoming`, `ended`)
- `script` (long-form prayer text)
- Required editable columns per canonical series row:
- same core fields + `scheduleType`, `visibilityScope`, `accessMode`, `stateMetadata`.

## Asset placement instructions
- Use rows filtered to page `Event/live content library` in `asset-placement-index.csv`.
- Required slots:
- `live.card.default`
- `live.card.flagship1111`
- Bind slot by each row’s `associatedImageSlot` value.

## Motion-layer notes
- Keep state chip preview variants for live/waiting_room/upcoming/ended.
- Keep notes for flagship and 11:11 accent behavior to preserve semantic prominence.
