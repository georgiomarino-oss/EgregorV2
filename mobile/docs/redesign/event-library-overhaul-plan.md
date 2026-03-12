# Event Library Overhaul Plan

Date: 2026-03-11
Owner: Codex implementation pass
Scope: Canonical content/data/pipeline overhaul for event library only.

## Goals

1. Keep canonical app architecture intact: Home / Circles / Live / Profile with canonical `event_series -> event_occurrences -> rooms` model.
2. Remove obsolete event sources (`event_library_items`, `news_driven_events`, legacy event fallbacks) after archive.
3. Seed a stronger spiritually coherent recurring event series set.
4. Add real lunar-synced Full Moon and New Moon series using authoritative data.
5. Persist unique OpenAI scripts for events (generate once, reuse).
6. Persist ElevenLabs audio/timings for events (generate once, reuse).
7. Add idempotent prewarm/backfill tooling for prayers + events.

## Current Event-Source Audit

### Canonical sources (keep, extend)

1. `public.event_series`
2. `public.event_occurrences`
3. `public.rooms`
4. `public.room_participants`
5. `public.event_reminder_preferences`
6. RPC chain used by current app:
   - `list_event_feed`
   - `get_event_occurrence_by_join_target`
   - `ensure_joinable_occurrence_room`
   - `join_event_room`
   - `leave_event_room`
   - `refresh_event_room_presence`
   - `list_active_occurrence_presence`

### Legacy/obsolete sources (archive then remove/deactivate)

1. `public.event_library_items` (legacy curated templates not part of canonical Live chain)
2. `public.news_driven_events` (obsolete news-synthesis flow)
3. `public.events` rows that are not needed for canonical migration compatibility
4. `public.event_participants` rows tied to legacy room semantics
5. Mobile legacy fallbacks:
   - `listEventFeedFromLegacyTables`
   - legacy `event_participants` join/leave/heartbeat fallback
   - `fetchEventLibraryItems` / `fetchNewsDrivenEvents` prefetch paths
   - `EVENT_LIBRARY_CATALOG` seed fallback
6. Obsolete operational script:
   - `supabase/functions/generate-news-driven-events`
   - `supabase/scripts/prewarm-event-library-audio-artifacts.mjs` (removed in cleanup; canonical replacement is `prewarm-event-occurrence-audio-artifacts.mjs`)

## Canonical vs Obsolete Table/Row Classification

### Canonical rows to keep

1. `event_series` rows in final curated set below.
2. `event_occurrences` materialized from canonical active series.
3. `rooms` / `room_participants` linked to canonical occurrences.
4. Notification/reminder rows targeting canonical occurrence/room identity.

### Obsolete rows to archive + remove/deactivate

1. `event_library_items`: all rows.
2. `news_driven_events`: all rows.
3. `events`: rows no longer required for canonical compatibility (archive then delete).
4. `event_participants`: legacy rows (archive then delete).
5. `event_series`: rows not in final curated canonical key set (archive then set `is_active=false`; remove future stale occurrences).
6. `event_occurrences`: stale future scheduled occurrences from deactivated/obsolete series (archive then delete).

## Archive + Deletion Strategy

1. Add archive tables:
   - `event_library_items_archive`
   - `news_driven_events_archive`
   - `events_archive`
   - `event_participants_archive`
   - `event_series_archive`
   - `event_occurrences_archive`
   Each archive table stores source row payload plus `archived_at`, `archive_reason`, `archive_batch`.
2. Perform archive inserts idempotently using source primary keys + `on conflict do nothing`.
3. Cleanup in safe order:
   - archive old rows,
   - delete non-canonical content tables rows (`event_library_items`, `news_driven_events`, legacy `event_participants`, obsolete `events`),
   - deactivate obsolete series,
   - remove only future stale occurrences from deactivated series.
4. Keep canonical historical room telemetry where safe by not hard-deleting unrelated room history.
5. Emit explicit archive/removal summary artifacts in pass docs.

## Proposed Canonical Event Series Set

All series include stable key, title, category, schedule semantics, script metadata, and preferred voice metadata in `event_series.metadata`.

1. `daily-1111-intention-reset`
   - Title: 11:11 Intention Reset
   - Category: Daily Rhythm
   - Schedule: local daily at 11:11 (`viewer_local`)
   - Duration: 11
   - Flagship: true (11:11 ritual)
2. `sunrise-gratitude`
   - Title: Sunrise Gratitude
   - Category: Daily Rhythm
   - Schedule: local daily at 07:00 (`viewer_local`)
   - Duration: 12
3. `evening-release-reflection`
   - Title: Evening Release Reflection
   - Category: Daily Rhythm
   - Schedule: local daily at 21:30 (`viewer_local`)
   - Duration: 15
4. `global-peace-circle`
   - Title: Global Peace Circle
   - Category: Global Intention
   - Schedule: UTC interval (every 6h shared global moment)
   - Duration: 15
   - Flagship: true
5. `global-awakening-meditation`
   - Title: Global Awakening Meditation
   - Category: Meditation
   - Schedule: UTC interval (every 8h shared global moment)
   - Duration: 20
6. `heart-coherence-circle`
   - Title: Heart Coherence Circle
   - Category: Heart Coherence
   - Schedule: UTC interval (every 12h shared global moment)
   - Duration: 15
7. `full-moon-gathering`
   - Title: Full Moon Gathering
   - Category: Lunar Rhythm
   - Schedule: lunar phase materialized from real full moon timestamps
   - Duration: 24
   - Flagship: true
8. `new-moon-intention-setting`
   - Title: New Moon Intention Setting
   - Category: Lunar Rhythm
   - Schedule: lunar phase materialized from real new moon timestamps
   - Duration: 20
9. `special-collective-moment`
   - Title: Special Collective Moment
   - Category: Special Moment
   - Schedule: admin curated
   - Duration: 20
10. `emergency-global-prayer`
   - Title: Emergency Global Prayer
   - Category: Alert
   - Schedule: manual trigger
   - Duration: 20

## Lunar / Full Moon Approach

1. Data source: U.S. Naval Observatory moon phase data API (authoritative astronomical source).
   - Endpoint pattern: `https://aa.usno.navy.mil/api/moon/phases/year?year=YYYY`
2. Eclipse overlay source: NASA Lunar Eclipse Catalog (2021-2030) for eclipse-qualified full moons.
   - Endpoint/page: `https://eclipse.gsfc.nasa.gov/LEcat5/LE2021-2030.html`
3. Persist source-derived lunar rows in `public.lunar_phase_reference`:
   - `phase_type` (`full_moon`, `new_moon`)
   - `occurs_at_utc`
   - `accepted_name` (for full moon; e.g., Strawberry, Sturgeon)
   - `name_source` + raw source payload.
4. Accepted full moon naming model:
   - month-based accepted traditional names (Wolf, Snow, Worm, Pink, Flower, Strawberry, Buck, Sturgeon, Harvest, Hunter's, Beaver, Cold).
5. `Blood Moon` policy:
   - only applied when eclipse metadata confirms an actual lunar eclipse coinciding with full moon.
   - no Blood Moon label emitted by default unless eclipse-qualified data exists.
6. Materialization horizon:
   - seed/reference for at least rolling 24 months (implemented with multi-year reference insert and refresh tooling).
7. Canonical occurrence materialization:
   - extend `materialize_event_occurrences` to generate occurrences for lunar schedule type by joining event series metadata to `lunar_phase_reference`.

## Script Persistence and Generation Strategy

1. Add canonical table `event_occurrence_content` keyed by occurrence + language.
2. Persist once per occurrence:
   - script text
   - script hashes/checksums
   - model/version/tone metadata
   - preferred voice metadata
   - audio/timing artifact linkage fields
3. Add idempotent generation RPC/edge flow:
   - generate only if artifact absent unless `force=true`
   - store deterministic hash/checksum for reuse validation
4. Prompting style:
   - reuse prayer quality constraints (TTS-safe prose, natural cadence, no bullet/robotic formatting)
   - event-specific instructions from series metadata + occurrence context (including moon name/date for lunar events)
   - uniqueness constraints against prior generated event scripts.

## Audio + Timing Persistence Strategy

1. Reuse existing `generate-prayer-audio` ElevenLabs storage/artifact pipeline.
2. Extend request context to include event occurrence content linkage.
3. Persist per event occurrence content row:
   - linked audio artifact reference
   - voice/model/cache metadata
   - timing presence metadata (word timings/segment availability)
4. Reuse by hash+voice+model via existing `prayer_audio_artifacts` unique key.
5. Runtime policy:
   - user load uses cached artifacts only (`allowGeneration=false`);
   - generation happens in prewarm/backfill jobs.

## Prewarm and Backfill Strategy

1. Keep existing prayer script/audio prewarm scripts.
2. Add event prewarm scripts:
   - `prewarm-event-occurrence-scripts.mjs`
   - `prewarm-event-occurrence-audio-artifacts.mjs`
   - `validate-event-occurrence-artifacts.mjs`
   - `backfill-missing-event-artifacts.mjs`
3. Idempotence rules:
   - script prewarm skips existing content unless forced
   - audio prewarm skips ready artifact links unless forced
   - validation reports missing script/audio/timings without mutating unless backfill invoked
4. Operational mode when ElevenLabs unavailable:
   - scripts prewarm fully
   - audio rows remain pending/missing with explicit status and resumable backfill.

## Risks and Mitigations

1. Risk: Breaking canonical Live feed with aggressive cleanup.
   - Mitigation: archive-first, deactivate obsolete series, preserve core RPC contracts.
2. Risk: lunar date/time drift or naming inaccuracies.
   - Mitigation: authoritative source persistence + explicit source metadata + tests.
3. Risk: script/audio regeneration loops.
   - Mitigation: strict unique constraints + hash-based idempotence + `force` gate.
4. Risk: ElevenLabs credit exhaustion.
   - Mitigation: no runtime generation, cache-only runtime, resumable backfill jobs.
5. Risk: reminder target regressions when IDs change.
   - Mitigation: keep occurrence identity stable, update notification mapping tests.

## Migration/Execution Order

1. Add plan doc (this file).
2. Add schema migration for archive tables + lunar reference + event content persistence + curated series reseed + cleanup.
3. Add/extend SQL functions for lunar materialization + event content retrieval.
4. Add edge functions and scripts for script/audio generation + prewarm/backfill/validation.
5. Update mobile data/runtime integration to canonical event content artifacts only.
6. Remove obsolete event/news/event-library runtime references.
7. Update tests (SQL + mobile targeted).
8. Run validation commands:
   - `npm --prefix mobile run typecheck`
   - `npm --prefix mobile run test:release-baseline`
   - targeted Supabase SQL test flow.
9. Produce pass + manual QA docs with archive/removal and deferred notes.
