# Phase 3A Verification Report

Date: 2026-03-08  
Scope: Verification and minimal bug-fix pass for canonical Event Series -> Event Occurrence -> Room domain architecture.

## Environment

- Local Supabase (`supabase db reset --local`) on branch `dev`.
- Local Postgres test execution via `docker exec ... psql`.
- Mobile compile compatibility check via `npm run typecheck` in `mobile/`.

## Migration Result

- `supabase/migrations/20260308130000_phase_3a_canonical_event_domain.sql` applied cleanly during full local reset.
- No migration-order failures or schema-application blockers observed.

## Test Execution Summary

Executed and passed:

1. `supabase/tests/phase_3a_event_domain.sql`
2. `supabase/tests/phase_3a_event_domain_idempotence.sql` (new focused verification)
3. `supabase/tests/phase_2a_circle_collaboration.sql`
4. `supabase/tests/phase_2b_circle_invite_preview.sql`
5. `mobile` typecheck (`tsc --noEmit`)

## Bugs Found

1. `admin_trigger_event_occurrence` was executable by `anon` and `authenticated` due function ACL defaults.
   - Impact: unauthorized users could invoke admin/manual trigger entrypoint.
   - Evidence: authenticated/anon calls reached function body before fix.

## Fixes Made

1. Hardened function ACLs in Phase 3A migration:
   - Explicitly revoked `anon` execute on canonical event-domain RPCs.
   - Explicitly revoked `authenticated` execute on `admin_trigger_event_occurrence`.
   - Explicitly granted `admin_trigger_event_occurrence` execute to `service_role`.
2. Updated `supabase/tests/phase_3a_event_domain.sql`:
   - Manual trigger setup now runs in privileged context (not authenticated user).
   - Added explicit outsider negative assertion for `admin_trigger_event_occurrence`.
3. Added `supabase/tests/phase_3a_event_domain_idempotence.sql`:
   - repeated materialization idempotence
   - repeated `ensure_joinable_occurrence_room` idempotence
   - repeated `join_event_room` idempotence (no duplicate participant rows)
   - leave/rejoin stability
   - reminder upsert idempotence
   - canonical join-target precedence over legacy target when both are provided
   - timezone fallback/change behavior
   - DST-aware 11:11 local behavior validation
   - authenticated-blocked admin trigger verification
4. Updated `mobile/docs/redesign/phase-3a-event-domain-note.md` to reflect the hardened execute model.

## Canonical Behavior Verification

- Recurring occurrence materialization: verified and idempotent (`second call => 0 inserts` for same horizon inputs).
- 11:11 local behavior: verified for `America/New_York`, including DST boundary shift while preserving 11:11 local wall-clock.
- UTC shared moments: verified `global-heartbeat` cadence at 6-hour UTC intervals.
- Occurrence->room mapping: verified stable one-room-per-occurrence identity and stable `ensure_*` returns.
- Join-target resolution: verified canonical occurrence target precedence and room/occurrence/key resolution paths.
- Participant presence/counts: verified counts derive from `room_participants`, with repeat join deduplication and leave/rejoin correctness.
- Reminder targeting: verified occurrence-native persistence and idempotent update semantics in `event_reminder_preferences`.
- Visibility/access boundaries: verified circle-scoped access/denial behavior remains correct.

## RLS / Access Verification

- `anon` execution removed from canonical feed/join/reminder RPCs in Phase 3A domain.
- `admin_trigger_event_occurrence` is now not callable by authenticated users.
- Privileged trigger path remains available via `service_role`.

## Legacy Compatibility Verification

- Mobile app compiles with current compatibility adapters (`npm run typecheck` passed).
- Canonical feed/join APIs remain available in `mobile/src/lib/api/data.ts`.
- Legacy fallback paths remain only for migration-lag compatibility (missing table/function scenarios), not canonical-first paths.

## Concurrency/Idempotence Confidence

- Confidence level: acceptable for Phase 3B entry.
- Verified strong idempotence under repeated invocation loops for:
  - occurrence materialization
  - room identity ensure
  - join room participant upsert
  - reminder preference upsert
- True high-contention parallel load testing was not run in this pass; residual risk remains around extreme concurrent spikes.

## Remaining Known Risks Before Phase 3B

1. No dedicated stress harness for high parallel join bursts (beyond repeated-call idempotence checks).
2. Legacy compatibility code still exists in mobile data layer by design; cleanup/removal remains Phase 3B+.
3. UX-level verification (full Live IA overhaul) intentionally out of scope for this backend/domain pass.
