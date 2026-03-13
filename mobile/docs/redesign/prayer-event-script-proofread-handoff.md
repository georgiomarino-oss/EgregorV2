# Prayer And Event Script Proofread + Design Handoff

Generated: 2026-03-13T12:46:55.145Z
Supabase project ref: `rmrfqxmanbgglwkhsblf`
Event horizon exported: next 540 days

## Export summary
- Prayer script rows exported: 186
- Event occurrence rows exported (full schedule): 6541
- Event occurrence rows exported (script-ready): 366
- Canonical event series represented: 8
- Prayer rows missing script text: 0
- Event rows missing script text: 6175

## Files in this package
- `mobile/docs/redesign/prayer-script-proofread.csv`
- `mobile/docs/redesign/event-occurrence-schedule-all.csv`
- `mobile/docs/redesign/event-occurrence-script-proofread.csv`
- `mobile/docs/redesign/event-series-design-reference.csv`

## Column guide

### Prayer CSV (`prayer-script-proofread.csv`)
- `prayer_title`
- `prayer_category`
- `duration_minutes`
- `script_text`

### Event occurrence CSV (`event-occurrence-schedule-all.csv`)
- `scheduled_start_utc`
- `event_display_title`
- `event_series_name`
- `event_category`
- `script_text`

### Event script-only CSV (`event-occurrence-script-proofread.csv`)
- Same columns as full schedule export, filtered to rows with non-empty `script_text` for proofreading.

### Event series design CSV (`event-series-design-reference.csv`)
- `series_name`
- `series_category`
- `schedule_summary`
- `series_metadata_json`

Use these exports for script proofreading and for replacing card/background visual assets in design.
