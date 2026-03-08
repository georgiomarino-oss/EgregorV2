# Phase 2A Verification Report

Date: 2026-03-08  
Scope: Backend/domain verification and minimal bug-fix pass for Phase 2A circle collaboration foundation.

## Environment

- Target DB: local Supabase dev stack (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
- Runtime: `supabase` CLI `2.75.0`
- SQL executor: `docker exec ... psql` (host `psql` binary was not installed)

## Migration Apply Result

- `supabase db reset --local` applied migrations cleanly through:
  - `20260308120000_circle_membership_invitation_schema.sql`
  - `20260308121000_circle_collaboration_rpc.sql`
  - `20260308122000_circle_collaboration_policies_and_compat.sql`
  - `20260308123000_phase_2a_circle_collaboration_fixes.sql` (new)
- One reset run ended with a transient container restart `502` after migrations were already applied; service health check (`supabase status`) was green and subsequent validation runs succeeded.

## Tests Executed

1. `supabase/tests/phase_2a_circle_collaboration.sql`
- First run: **failed** (`permission denied for table _phase2a_ctx` after role switch).
- Second run: **failed** (`digest(...)` not found in `hash_external_contact`).
- Third run: **failed** (`accept_circle_invite` conflict target ambiguity).
- Final run after fixes: **passed** end-to-end.

2. Additional transactional verification run (ad hoc SQL, rollback-only)
- Covered all required canonical RPCs, legacy adapters, shared-solo gate, RLS, and integrity checks.
- Final run: **passed**.

## Bugs Found

1. SQL test harness role/temporary table access bug
- Symptom: `_phase2a_ctx` inaccessible after `set local role authenticated`.
- Impact: integration test aborted before exercising core logic.
- Fix: grant temp table privileges to `authenticated` in test script.

2. `hash_external_contact` extension function lookup bug
- Symptom: `function digest(text, unknown) does not exist` when creating invites.
- Root cause: unqualified `digest(...)` under Supabase extension schema/search path behavior.
- Fix: use `extensions.digest(...)`.

3. `accept_circle_invite` upsert conflict-target ambiguity bug
- Symptom: `column reference "circle_id" is ambiguous` inside `on conflict (circle_id, user_id)`.
- Root cause: PL/pgSQL `returns table` output-column variable name collision.
- Fix: `on conflict on constraint circle_members_pkey`.

## Code/Migration Fixes Made

- Updated `supabase/tests/phase_2a_circle_collaboration.sql`:
  - added `grant all on table _phase2a_ctx to authenticated;`
- Updated `supabase/migrations/20260308120000_circle_membership_invitation_schema.sql`:
  - `digest(...)` -> `extensions.digest(...)` in `hash_external_contact`
- Updated `supabase/migrations/20260308121000_circle_collaboration_rpc.sql`:
  - `accept_circle_invite` uses `on conflict on constraint circle_members_pkey`
- Added `supabase/migrations/20260308123000_phase_2a_circle_collaboration_fixes.sql`:
  - forward-safe `create or replace` patch for both functions above on already-migrated DBs
- Updated `mobile/docs/redesign/phase-2a-implementation-note.md` with corrected assumptions.

## Required Checks Outcome

### Canonical RPC Verification

All required RPCs verified against local DB:
- `list_my_circles`: pass
- `list_shared_with_me`: pass
- `list_pending_circle_invites`: pass (including expired transition path)
- `search_invitable_users`: pass (minimal field shape: `user_id`, `display_name`)
- `create_circle_invite`: pass (including duplicate-pending handling)
- `accept_circle_invite`: pass
- `decline_circle_invite`: pass
- `revoke_circle_invite`: pass (including unauthorized revoke denial)
- `list_circle_members`: pass
- `update_circle_member_role`: pass (owner/steward boundary enforced)
- `remove_circle_member`: pass (including last-owner guard)

### Legacy Adapter Verification

All compatibility adapters validated:
- `get_prayer_circle_members`: pass
- `get_events_circle_members`: pass
- `search_app_users_for_circle`: pass
- `add_user_to_prayer_circle` / `remove_user_from_prayer_circle`: pass
- `add_user_to_events_circle` / `remove_user_from_events_circle`: pass

### Shared-Solo Membership Gate

- `is_shared_solo_circle_member` verified:
  - active member: allowed
  - removed member: denied
  - outsider: denied

### Least-Privilege / RLS Verification

- Outsider cannot read unrelated circle row.
- Outsider cannot list foreign circle members.
- Outsider cannot see unrelated invite-target rows.
- Direct authenticated writes to `circle_members` and `circle_invitations` are blocked (insert/update/delete).

### Integrity Checks

- No duplicate active membership per user/circle: pass
- Owner membership exists/remains valid: pass
- Duplicate pending invites handled correctly (dedup to one pending row): pass
- Invite token uniqueness: pass
- Invite lifecycle transitions (`accepted/declined/revoked/expired`) behave correctly: pass
- Removed memberships excluded from active member listing: pass
- Invite-target circle visibility does not leak unrelated data: pass
- Search output limited to minimum profile fields needed: pass
- RPC-only write paths protected from direct table writes: pass

## Remaining Known Risks Before UX Pass

- Expiration is a lazy transition (`pending` -> `expired`) when invite reads/actions occur; there is no background scheduler in this phase to proactively sweep stale pending invites.
- Verification was completed on local dev stack; remote shared dev/staging should run the same SQL suite before UX rollout.
