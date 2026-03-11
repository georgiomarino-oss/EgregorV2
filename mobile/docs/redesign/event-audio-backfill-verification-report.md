# Event Audio Backfill Verification Report

Date: 2026-03-11  
Target Supabase project: `rmrfqxmanbgglwkhsblf` (staging)

## Scope

Post-quota pass for canonical event audio artifacts and timing/alignment validation on the launch horizon.

## 1) Environment and Quota Verification

Checks:
- `supabase secrets list --project-ref rmrfqxmanbgglwkhsblf`
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --dry-run`
- Actual generation probes during full backfill run.

Result:
- ElevenLabs env secret is present remotely.
- ElevenLabs credits are still exhausted in provider responses:
  - `quota_exceeded`
  - `You have 0 credits remaining`

Conclusion:
- Env is configured, but credits are not available for generation.

## 2) Required Order Execution

### Step 1: Dry-run audio prewarm/backfill

Command:
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --dry-run`

Result:
- Planned jobs: `378` (at time of dry-run).

### Step 2: Actual audio prewarm (launch horizon)

Commands:
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --concurrency=2`
- `node supabase/scripts/prewarm-event-occurrence-scripts.mjs --horizon-days=30 --concurrency=3` (filled 1 newly-materialized occurrence script)
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --concurrency=2`

Final launch-horizon targeting after script top-up:
- Targeted occurrences/content rows: `379`
- Audio generation success: `0`
- Audio generation failed: `379`
- Failure reason: `379/379 quota_exceeded`

### Step 3: Artifact validation

Command:
- `node supabase/scripts/validate-event-occurrence-artifacts.mjs --horizon-days=30`

Final validation result:
- `totalCanonicalOccurrences`: `379`
- `scriptReady`: `379`
- `missingScript`: `0`
- `audioReady`: `0`
- `missingAudio`: `379`
- `missingTimings`: `0`

## 3) Audio Artifact/Timing Persistence State

Launch-horizon (30-day) post-run state:
- `event_occurrence_content` rows: `379`
- `audio_status=failed`: `379`
- `audio_artifact_id` present: `379` (failed artifact records persisted)
- Ready/generated audio artifacts: `0`
- Artifacts with word timings: `0`
- `has_word_timings=true` in occurrence content: `0`

Interpretation:
- Persistence/linking pipeline is working (failed artifacts and linkage persisted).
- No usable audio/timing payloads were generated because provider quota blocked synthesis.

## 4) Manual Representative Category Audit

Sampled categories (first in-horizon canonical occurrence for each):
- Full Moon Gathering
- New Moon Intention Setting
- Global Peace Circle
- Global Awakening Meditation
- Heart Coherence Circle
- Sunrise Gratitude
- Evening Release Reflection
- 11:11 Intention Reset

Observed for all sampled categories:
- `audio_status=failed`
- `has_word_timings=false`
- `audio_error` shows ElevenLabs `quota_exceeded`

## 5) Voices Used / Applied

Voice assignment in launch-horizon event content (by `voice_id`):
- `V904i8ujLitGpMyoTznT` (Dominic): `158`
- `BFvr34n3gOoz0BAf9Rwn` (Amaya): `126`
- `bgU7lBMo69PNEOWHFqxM` (Rainbird): `63`
- `jfIS2w2yJi0grJZPyEsk` (Oliver): `32`

Data correction applied during this pass:
- Fixed 1 voice-label mismatch in `event_occurrence_content`.
- Fixed 1 matching voice-label mismatch in `prayer_audio_artifacts`.
- Post-fix mismatch count across known voice IDs: `0`.

## 6) Text/Audio Sync Validation Status

Required sync validation outcome:
- Could not validate positive text/audio sync against actual generated event audio because no audio artifacts reached `ready`.

What was validated:
- Pipeline writes failed linkage states correctly.
- Runtime-facing error path for missing cached event audio was verified:
  - Function invocation with `allowGeneration=false` returns expected `409 Audio artifact not found`.

What remains blocked:
- Confirmation that word timings correspond to actual saved audio files for event occurrences.

## 7) Runtime Consumer Verification

Inspected runtime consumers:
- `mobile/src/lib/api/data.ts`
- `mobile/src/lib/artifactPrefetch.ts`
- `mobile/src/screens/EventRoomScreen.tsx`

Findings:
- Canonical event room flow reads persisted `event_occurrence_content`.
- Audio generation/prefetch path uses `eventOccurrenceContentId`.
- Timed-word rendering path remains in place for synchronized script following when timings are available.

## 8) Commands Run (Requested)

Executed:
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --dry-run`
- `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --concurrency=2`
- `node supabase/scripts/validate-event-occurrence-artifacts.mjs --horizon-days=30`
- `npm --prefix mobile run typecheck`
- `npm --prefix mobile run test:release-baseline`

Regression results:
- `typecheck`: pass
- `test:release-baseline`: pass

## 9) Release Readiness Summary (Event Audio)

Status: **Not launch-ready for event audio**.

Blocking gap:
- ElevenLabs credits remain exhausted (`quota_exceeded`, `0 credits remaining`), so no event audio/timing artifacts were generated.

Unblocked once credits are restored:
1. Re-run:
   - `node supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs --horizon-days=30 --allow-generation --concurrency=2`
2. Validate:
   - `node supabase/scripts/validate-event-occurrence-artifacts.mjs --horizon-days=30 --strict`
3. Expand horizon (optional release hardening):
   - `--horizon-days=60` then `--horizon-days=90`

## 10) Changed Files / Tooling Fixes in This Pass

Code/files changed:
- `mobile/docs/redesign/event-audio-backfill-verification-report.md` (new)

No script/function code changes were required in this pass.
Data-only correction performed remotely:
- voice label normalization for 1 `event_occurrence_content` row and 1 `prayer_audio_artifacts` row.
