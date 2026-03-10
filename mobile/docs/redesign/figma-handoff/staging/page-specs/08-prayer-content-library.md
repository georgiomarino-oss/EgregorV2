# Prayer content library - Figma Page Spec

## Canonical scope
- Objective: Provide the complete active prayer library as editable design content.
- Canonical content included: all 62 active prayer items from the canonical exported library.
- Legacy excluded: retired prayer card semantics and non-canonical legacy content keys.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/prayer-content-library.csv`
- `mobile/docs/redesign/figma-handoff/staging/data/prayer-content-library.json`
- `mobile/docs/redesign/figma-content-mapping.md`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`

## Frame list
| Frame | Purpose |
| --- | --- |
| `Library/Prayer/Overview` | Column legend and treatment legend (`personal ritual`). |
| `Library/Prayer/AllRows` | One editable row/card per prayer item (62 rows). |
| `Library/Prayer/<Category>` | Category-specific grouped rows for fast browsing (Relationships, Wellbeing, Abundance, etc.). |

## Component list
- `PrayerContentRow` (editable data row)
- `PrayerCard` semantic preview (media slot + title/subtitle/description + chips)
- `PrayerCategoryHeader`

## Text/content assignment (editable)
- Required editable columns per row:
- `stableKey`
- `title`
- `subtitle`
- `description`
- `categoryTheme`
- `durationMinutes`
- `treatment`
- `appCtaLabel`
- `associatedImageSlot`
- `artDirectionNote`
- `tone`
- Do not truncate/replace copy with placeholder text.

## Asset placement instructions
- Use rows filtered to page `Prayer content library` in `asset-placement-index.csv`.
- Required slots:
- `solo.card.default` (primary)
- `solo.card.manifestation` (category-specific alternate)
- Bind slot by each row’s `associatedImageSlot` value.

## Motion-layer notes
- No mandatory standalone motion stack on this page.
- Keep card preview entry behavior annotation for staggered rail context.
