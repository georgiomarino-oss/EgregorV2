# Event Library Overhaul Manual QA

Date: 2026-03-11
Scope: Manual QA checklist for canonical event-library overhaul.

## Prerequisites

1. App build with this pass applied.
2. Supabase migrations applied through:
   - `20260311173000_event_library_overhaul.sql`
3. Edge functions deployed:
   - `generate-event-occurrence-script`
   - `generate-prayer-audio`
4. For full audio QA, ElevenLabs env/credits available.

## Data and Cleanup QA

1. Run archive/removal summary query:
   - `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/event-library-cleanup-summary.sql`
2. Verify archived rows are present in `event_cleanup_archives` for batch `event_library_overhaul_20260311`.
3. Verify legacy tables are empty:
   - `event_library_items`
   - `news_driven_events`
   - `event_participants`
   - `events`
4. Verify active global system series are only canonical curated keys.

## Canonical Library QA (Live Feed)

1. Open Live tab.
2. Verify feed shows canonical recurring series and no legacy news/event-library cards.
3. Confirm section grouping behavior:
   - Live Now
   - Next 24 Hours
   - 11:11
   - Global Flagships
4. Confirm deep-link navigation still resolves canonical targets only:
   - `egregorv2://live/occurrence/:occurrenceId`
   - `egregorv2://room/:roomId`

## Lunar/Full Moon QA

1. Query lunar reference rows for 2026-2028.
2. Verify accepted full moon names are present (no fictitious names).
3. Verify known eclipse-qualified full moons are flagged (example checks):
   - 2026-03-03 (`Total Lunar Eclipse`)
   - 2027-07-18 (`Total Lunar Eclipse`)
4. Verify `full-moon-gathering` occurrence metadata contains:
   - `lunar_name`
   - `lunar_phase=full_moon`
   - eclipse flags where applicable
5. Verify `new-moon-intention-setting` occurrence metadata contains `lunar_phase=new_moon`.
6. Confirm UI title/copy in event list/details reflects real lunar naming from occurrence metadata.

## Script Persistence QA

1. Pick a canonical occurrence id.
2. Call script generation once:
   - invoke `generate-event-occurrence-script` with `occurrenceId`, `language='en'`, `force=false`.
3. Verify row exists in `event_occurrence_content` with:
   - script text/hash/checksum
   - model/tone/prompt metadata
   - voice recommendation metadata
4. Re-run with same input and `force=false`.
5. Confirm row is reused (no duplicate row; same `(occurrence_id, language)`).
6. Re-run with `force=true`.
7. Confirm row is updated in place (idempotent key preserved).

## Audio/Timing Persistence QA

1. For the same occurrence content row, invoke audio generation with:
   - `eventOccurrenceContentId`
   - `allowGeneration=true` (if ElevenLabs available)
2. Verify `prayer_audio_artifacts` row exists or is reused for script+voice hash.
3. Verify `event_occurrence_content` is linked/updated:
   - `audio_artifact_id`
   - `audio_status`
   - `has_word_timings`
   - voice metadata
4. Re-run same request and confirm artifact reuse (no new duplicate artifact hash row).
5. If ElevenLabs unavailable, run artifact-only mode and confirm graceful missing/pending behavior without redesign.

## Event Room Runtime QA

1. Open an event room from Live feed.
2. Confirm script shown in room is persisted event occurrence script (not route fallback copy).
3. Confirm room audio playback uses cached artifact path when available.
4. Confirm timed word/paragraph sync follows playback.
5. Confirm reminder toggle and report actions still work.

## Prewarm/Backfill QA

Run and verify outputs:

1. Event script prewarm
   - `node supabase/scripts/prewarm-event-occurrence-scripts.mjs --dry-run`
2. Event audio prewarm
   - `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --dry-run`
3. Event artifact validation
   - `node supabase/scripts/validate-event-occurrence-artifacts.mjs`
4. Event backfill
   - `node supabase/scripts/backfill-missing-event-artifacts.mjs --artifact-only`
5. Canonical combined prewarm (prayers + events)
   - `node supabase/scripts/prewarm-canonical-content.mjs --dry-run`

Acceptance criteria:

1. Re-running scripts is idempotent.
2. Existing script/audio artifacts are reused.
3. Missing artifacts are reported clearly.
4. Artifact-only mode works without consuming ElevenLabs credits.

## Notification/Reminder QA

1. Toggle reminder in EventDetails for canonical occurrence.
2. Verify canonical reminder preference rows target occurrence id.
3. Confirm no reminder routing break from event id/series changes.

## Regression QA

1. `npm --prefix mobile run typecheck`
2. `npm --prefix mobile run test:release-baseline`
3. Supabase SQL:
   - `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/event_library_overhaul.sql`
   - existing high-value SQL suites per release process

## Environment-Dependent Checks

1. ElevenLabs unavailable:
   - Expect script generation to pass.
   - Expect audio generation to remain pending/missing in artifact-only mode.
2. ElevenLabs available:
   - Expect ready audio and timings to be persisted and reused.
