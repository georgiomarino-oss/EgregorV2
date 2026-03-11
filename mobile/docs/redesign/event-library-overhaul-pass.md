# Event Library Overhaul Pass

Date: 2026-03-11
Scope: Canonical event content/data/pipeline overhaul on current app architecture.

## Delivered Overview

This pass completed the canonical event-library/data pipeline overhaul without changing the top-level app model (Home / Circles / Live / Profile) or introducing legacy event routes.

Implemented outcomes:

1. Canonical data cleanup migration and archive-first removal path.
2. Curated canonical recurring global event series reseed.
3. Real lunar-synced Full Moon/New Moon scheduling via astronomical reference data.
4. Eclipse-qualified lunar metadata support for safe Blood Moon usage policy.
5. Event occurrence script persistence model and generation pipeline (OpenAI, idempotent + force refresh).
6. Event audio/timing persistence linkage to cached ElevenLabs artifacts (generate once, reuse).
7. Runtime integration updates so live room script/audio paths prefer persisted event occurrence content.
8. Idempotent prewarm/backfill tooling for events, plus canonical combined prewarm entrypoint.
9. Legacy event/news/event-library runtime path removal in mobile data and prefetch surfaces.

## Data Cleanup and Archive Strategy (Implemented)

Primary migration:
- `supabase/migrations/20260311173000_event_library_overhaul.sql`

Archive artifact:
- `public.event_cleanup_archives`
- archive batch: `event_library_overhaul_20260311`

Archive-before-delete coverage in migration:
- `event_library_items`
- `news_driven_events`
- `event_participants`
- `events`
- obsolete global canonical-system `event_series`
- obsolete future `event_occurrences` from non-canonical global series

Cleanup actions in migration:
- Deactivate non-canonical global system series (`is_active=false`).
- Delete obsolete future occurrences from deactivated non-canonical series.
- Delete legacy rows from `event_library_items`, `news_driven_events`, `event_participants`, and `events` after archive.

Archive/removal reporting query artifact:
- `supabase/scripts/event-library-cleanup-summary.sql`

## Canonical Series Set (Reseeded/Upserted)

Seeded in migration:

1. `daily-1111-intention-reset`
2. `sunrise-gratitude`
3. `evening-release-reflection`
4. `global-peace-circle`
5. `global-awakening-meditation`
6. `heart-coherence-circle`
7. `full-moon-gathering`
8. `new-moon-intention-setting`
9. `special-collective-moment`
10. `emergency-global-prayer`

Each seeded series includes cadence/schedule metadata, duration, access model, art-direction key, script-theme metadata, and voice recommendation metadata.

## Lunar Scheduling and Naming

Lunar reference table:
- `public.lunar_phase_reference`

Sources used:
1. USNO moon phase API for full/new moon timestamps:
   - `https://aa.usno.navy.mil/api/moon/phases/year?year=YYYY`
2. NASA lunar eclipse catalog overlay for eclipse-qualified full moons:
   - `https://eclipse.gsfc.nasa.gov/LEcat5/LE2021-2030.html`

Seed/reference artifact file:
- `supabase/scripts/lunar-phase-reference.2026-2028.json`

Materialization update:
- `public.materialize_event_occurrences(...)` extended to handle `schedule_type='lunar_phase'`.
- Full/new moon occurrences are materialized from `lunar_phase_reference` with metadata:
  - `lunar_name`
  - `lunar_phase`
  - `has_lunar_eclipse`
  - `eclipse_label`
  - source metadata

Eclipse annotations added for 2026-2028 full moons where astronomically applicable.

Blood Moon guardrail implementation:
- Script generator only permits Blood Moon phrasing when a real total lunar eclipse flag is present for that full moon occurrence.

## Event Script Persistence + Generation

New edge function:
- `supabase/functions/generate-event-occurrence-script/index.ts`
- configured in `supabase/config.toml` as `generate-event-occurrence-script`

Persistence model:
- `public.event_occurrence_content` (created in migration)
- idempotent key: `(occurrence_id, language)`

Generation behavior:
- Reads canonical occurrence + series metadata.
- Builds event-specific prompt using series theme, cadence context, lunar context.
- Applies uniqueness constraints against recent generated scripts.
- Sanitizes for spoken delivery (TTS-safe prose + paragraph rhythm).
- Persists script hash/checksum/model/tone/prompt version.
- `force=true` regenerates and updates the same persisted row.
- Reuse path returns existing script when already present and not forced.

## Audio + Timing Persistence and Reuse

Extended edge function:
- `supabase/functions/generate-prayer-audio/index.ts`

Enhancement:
- New request field: `eventOccurrenceContentId`.
- Function now syncs event content linkage on cached, pending, failed, and ready paths:
  - `audio_artifact_id`
  - `audio_status`
  - `audio_error`
  - `audio_generated_at`
  - `has_word_timings`
  - `voice_id` / `voice_label`

Result:
- Event audio uses existing `prayer_audio_artifacts` cache strategy (hash + voice + model + cache_version).
- Timings remain persisted and reusable.
- No repeated credit burn for same script+voice artifact.

## Runtime Integration Changes

### Mobile data/runtime cleanup

Updated:
- `mobile/src/lib/api/data.ts`

Key changes:
1. Removed legacy event/news/event-library data APIs and caches.
2. Removed legacy `event_participants` fallback usage.
3. Profile event participation now derives from canonical `room_participants` + `rooms(room_kind='event_occurrence')`.
4. Canonical-only join target handling (no legacy event IDs in runtime calls).
5. Event room snapshots include persisted `eventContent` (`event_occurrence_content`).

### Live room script/audio usage

Updated:
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/features/room-player/hooks/useRoomAudioPlayer.ts`
- `mobile/src/lib/api/functions.ts`
- `mobile/src/screens/EventDetailsScreen.tsx`
- `mobile/src/screens/EventsScreen.tsx`

Key changes:
1. Event room hydration now prefers persisted `event_occurrence_content.script_text`.
2. Voice recommendation metadata is applied when present.
3. Audio prefetch/player calls include `eventOccurrenceContentId` for artifact-link sync.
4. Entry routes no longer rely on fallback route script text as primary source.

### Artifact prefetch cleanup

Updated:
- `mobile/src/lib/artifactPrefetch.ts`

Key changes:
1. Removed `event_library_items` and `news_driven_events` prefetch dependencies.
2. Prefetch now targets canonical `listEventFeed` + persisted `event_occurrence_content` scripts.

### Live flagship key updates

Updated:
- `mobile/src/features/events/services/liveModel.ts`
- `mobile/src/features/events/services/globeVisualState.ts`
- related tests updated for new canonical flagship keys.

## Prewarm/Backfill Tooling

New scripts:

1. Script prewarm
- `supabase/scripts/prewarm-event-occurrence-scripts.mjs`

2. Audio prewarm
- `supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs`

3. Artifact validation
- `supabase/scripts/validate-event-occurrence-artifacts.mjs`

4. Missing-artifact backfill
- `supabase/scripts/backfill-missing-event-artifacts.mjs`

5. Combined canonical prewarm (prayers + events)
- `supabase/scripts/prewarm-canonical-content.mjs`

Compatibility shim:
- `supabase/scripts/prewarm-event-library-audio-artifacts.mjs` now delegates to canonical occurrence audio prewarm script and logs deprecation.

Prayer prewarm remains in place:
- `supabase/scripts/generate-prayer-library-scripts.mjs`
- `supabase/scripts/prewarm-prayer-audio-artifacts.mjs`

## Tests and Verification

Executed and passing:

1. `npm --prefix mobile run typecheck`
2. `npm --prefix mobile run test:release-baseline`

Added SQL test:
- `supabase/tests/event_library_overhaul.sql`
- README updated: `supabase/tests/README.md`

Supabase DB/sql execution status in this environment:
- Not executed here because local Supabase Docker stack was unavailable (`supabase status` failed due missing Docker engine) and `SUPABASE_DB_URL` was not set.

## Obsolete Surface Cleanup

Removed/retired:
- Runtime usage of `event_library_items`, `news_driven_events`, and legacy event participant fallbacks.
- `supabase/functions/generate-news-driven-events/index.ts` deleted.

Note:
- Empty `supabase/functions/generate-news-driven-events/` directory remains in workspace due shell removal policy restrictions in this environment; it contains no function source.

## Changed File Groups

Primary touched areas:

- Supabase migration/data model:
  - `supabase/migrations/20260311173000_event_library_overhaul.sql`

- Supabase functions:
  - `supabase/functions/generate-event-occurrence-script/index.ts` (new)
  - `supabase/functions/generate-prayer-audio/index.ts` (extended)
  - `supabase/config.toml`

- Supabase scripts:
  - `supabase/scripts/prewarm-event-occurrence-scripts.mjs` (new)
  - `supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs` (new)
  - `supabase/scripts/validate-event-occurrence-artifacts.mjs` (new)
  - `supabase/scripts/backfill-missing-event-artifacts.mjs` (new)
  - `supabase/scripts/prewarm-canonical-content.mjs` (new)
  - `supabase/scripts/event-library-cleanup-summary.sql` (new)
  - `supabase/scripts/prewarm-event-library-audio-artifacts.mjs` (deprecated shim)
  - `supabase/scripts/lunar-phase-reference.2026-2028.json` (updated)

- Mobile runtime:
  - `mobile/src/lib/api/data.ts`
  - `mobile/src/lib/artifactPrefetch.ts`
  - `mobile/src/lib/api/functions.ts`
  - `mobile/src/screens/EventRoomScreen.tsx`
  - `mobile/src/screens/EventDetailsScreen.tsx`
  - `mobile/src/screens/EventsScreen.tsx`
  - `mobile/src/features/room-player/hooks/useRoomAudioPlayer.ts`
  - `mobile/src/features/events/services/liveModel.ts`
  - `mobile/src/features/events/services/globeVisualState.ts`
  - `mobile/src/lib/catalog/eventLibraryCatalog.ts` (deleted)

- Tests/docs:
  - `mobile/tests/phase3b-live-model.test.cts`
  - `mobile/tests/globe-canonical-data-mapping.test.cts`
  - `supabase/tests/event_library_overhaul.sql` (new)
  - `supabase/tests/README.md`
  - `mobile/docs/redesign/event-library-overhaul-plan.md`

## Deferred/Environment-Limited Items

1. Supabase SQL integration test execution and full reset flow were not runnable here because Docker/local stack was unavailable.
2. ElevenLabs generation remains environment-dependent:
   - If ElevenLabs keys/credits are unavailable, script generation and artifact-link/backfill still work, and audio prewarm can run in artifact-only mode.
