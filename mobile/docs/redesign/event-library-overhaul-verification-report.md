# Event Library Overhaul Verification Report

Date: 2026-03-11  
Target project: `rmrfqxmanbgglwkhsblf` (staging-linked Supabase project)

## 1) Environment and Safety Checks

- Confirmed linked target is active (`EgregorV2`, `eu-central-1`).
- Confirmed required remote secrets exist (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`).
- Local shell env did not expose DB URL directly, so remote-backed verification was performed via authenticated REST and edge function invocation.
- Docker-backed `supabase db dump --linked` was unavailable in this environment, so a pre-migration REST backup snapshot was created:
  - `supabase/backups/pre_event_overhaul_rest_backup_20260311_185633.json`

## 2) Migration Apply and Verification

Migration status:
- `20260311172950_add_lunar_phase_enum.sql` applied.
- `20260311173000_event_library_overhaul.sql` applied.

Migration bugs found and fixed:
- Fixed enum transaction ordering issue (`unsafe use of new value "lunar_phase"`):
  - Added `supabase/migrations/20260311172950_add_lunar_phase_enum.sql`.
- Fixed cleanup delete ordering issue (room constraint blocked obsolete occurrence delete):
  - Updated `20260311173000_event_library_overhaul.sql` to delete obsolete `rooms` before deleting obsolete `event_occurrences`.

SQL verification execution:
- `supabase/tests/event_library_overhaul.sql` could not be executed via direct `psql` in this environment.
- Equivalent assertion set was executed against staging via REST with the same checks; result: `PASS`.

Cleanup summary execution:
- `supabase/scripts/event-library-cleanup-summary.sql` could not be executed via direct `psql` in this environment.
- Equivalent summary queries were executed against staging via REST and matched expected outcomes.

## 3) Cleanup Results

Archive batch: `event_library_overhaul_20260311`

Archived obsolete rows:
- `news_driven_events`: 2
- `event_series`: 4
- `event_occurrences`: 47

Removed/deactivated obsolete rows:
- Active non-canonical global system series after migration: 0
- Remaining rows in legacy tables:
  - `event_library_items`: 0
  - `news_driven_events`: 0
  - `event_participants`: 0
  - `events`: 0

Final canonical counts:
- Active canonical global system series: 10
- Active non-canonical global system series: 0
- Canonical occurrences in next 30 days: 378
- Canonical occurrences in 540-day horizon: 6533

Unexpected residual legacy rows:
- None detected.

## 4) Canonical Seeded Series Audit

Canonical seeded series present and active:
- `daily-1111-intention-reset` (`local_time_daily`, `viewer_local`, 11 min, flagship)
- `sunrise-gratitude` (`local_time_daily`, `viewer_local`, 12 min)
- `evening-release-reflection` (`local_time_daily`, `viewer_local`, 15 min)
- `global-peace-circle` (`utc_interval` every 360 min, 15 min, flagship)
- `global-awakening-meditation` (`utc_interval` every 480 min, 20 min)
- `heart-coherence-circle` (`utc_interval` every 720 min, 15 min)
- `full-moon-gathering` (`lunar_phase` full moon, 24 min, flagship)
- `new-moon-intention-setting` (`lunar_phase` new moon, 20 min)
- `special-collective-moment` (`admin_curated`, 20 min)
- `emergency-global-prayer` (`manual_trigger`, 20 min, flagship)

Quality audit notes:
- No duplicate canonical keys.
- No obvious concept collision inside the canonical set.
- Categories and cadence coverage are coherent for daily, global interval, lunar, and special/emergency paths.

## 5) Lunar / Full Moon Verification

Reference coverage checks:
- `lunar_phase_reference` rows for full/new moon in 2026-2028: 75 (passes threshold).
- Full moon rows missing accepted names: 0.

Required eclipse rows present:
- `2026-03-03T11:38:00Z` flagged with `Total Lunar Eclipse`.
- `2027-07-18T15:45:00Z` flagged with `Total Lunar Eclipse`.

Upcoming materialized lunar occurrences verified:
- Full Moon sample includes accepted names and correct metadata (`Pink Moon`, `Flower Moon`, `Strawberry Moon`, `Buck Moon`, `Sturgeon Moon`, etc.).
- New Moon sample includes `lunar_phase=new_moon` and expected new-moon labeling.
- No fictitious moon labels observed.

Blood Moon policy check:
- Generated script rows containing `Blood Moon`: 0.
- No false Blood Moon labeling detected.

## 6) Script Prewarm and Idempotence

Commands run:
- `node supabase/scripts/prewarm-canonical-content.mjs --dry-run`
- `node supabase/scripts/prewarm-event-occurrence-scripts.mjs --horizon-days=30 --dry-run`
- `node supabase/scripts/prewarm-event-occurrence-scripts.mjs --horizon-days=30 --concurrency=3`

Results:
- Dry-run showed expected canonical pipeline behavior.
- 30-day canonical occurrence scripts are fully prewarmed (`378/378` present).
- Re-running script prewarm is idempotent (planned/generated = 0 when already present).
- Event occurrences read persisted `event_occurrence_content` rather than regenerating at user load.

## 7) Script Quality Spot Check

Representative manual sample reviewed across:
- peace / awakening / coherence
- full moon / new moon
- sunrise / evening
- 11:11 flagship moment

Findings:
- No opening-paragraph duplication in the 30-day sample set (`duplicate openings: 0`).
- Thematic coherence is strong and on-theme across sampled categories.
- Spoken cadence and punctuation are generally TTS-friendly.
- Pacing distribution in 30-day window:
  - 11 min avg: 769 words (~69.9 WPM)
  - 12 min avg: 835 words (~69.6 WPM)
  - 15 min avg: 970 words (~64.7 WPM)
  - 20 min avg: 995 words (~49.8 WPM)
  - 24 min avg: 1063 words (~44.3 WPM)

Prompt/rules adjustments applied in this verification cycle:
- Long-duration generation constraints were tightened in `generate-event-occurrence-script` to improve duration fit and reduce short long-form outputs.
- Affected long-form subset was regenerated during staging backfill.

## 8) Audio / Timing Backfill

Commands run:
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --artifact-only --concurrency=3 --limit=20`
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --concurrency=2 --limit=20`
- `node supabase/scripts/validate-event-occurrence-artifacts.mjs --horizon-days=30`

Results:
- Artifact-only mode now reports missing artifacts correctly (not false failures).
- Generation mode failed with real provider quota errors (`quota_exceeded`, 0 credits remaining).
- Validation summary (30-day horizon):
  - `scriptReady`: 378
  - `missingScript`: 0
  - `audioReady`: 0
  - `missingAudio`: 378
  - `missingTimings`: 0

Tooling bug fixed:
- `supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs`
- Artifact-only missing-audio classification broadened to handle returned non-5xx statuses/messages from `generate-prayer-audio`.

## 9) Runtime Verification

Checks performed:
- `npm --prefix mobile run typecheck` passed.
- `npm --prefix mobile run test:release-baseline` passed.
- No remaining mobile runtime references to legacy event sources (`event_library_items`, `news_driven_events`, legacy event participant flow) detected.
- Event content/audio linkage references (`event_occurrence_content`, `eventOccurrenceContentId`) are present in room/detail/player data paths and prewarm scripts.

## 10) Remaining Risks / Deferred

- Direct `psql -f` execution for SQL test and cleanup summary was blocked by environment tooling constraints (no direct DB URL/psql path in this shell). Equivalent live assertions/queries were run and passed.
- ElevenLabs credits are exhausted in target environment; audio/timing generation cannot complete until credits are restored.
- Script prewarm beyond the verified 30-day window remains to be run as an operational backfill job if full 540-day content readiness is required immediately.
