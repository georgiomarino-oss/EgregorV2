# Phase 2A Implementation Note

Date: 2026-03-08  
Scope: Canonical circles/memberships/invitations backend foundation + service-layer APIs (no full UX rewrite)

## Canonical Model Applied

Phase 2A implements the redesign-doc canonical collaboration foundation:

1. `circles` remains the core group entity and is extended for future discoverability/governance metadata.
2. `circle_members` is evolved in place as the transitional canonical membership store (not replaced yet), adding:
   - role (`owner`, `steward`, `member`)
   - status (`pending`, `active`, `removed`)
   - source invitation link
   - lifecycle timestamps
3. `circle_invitations` is introduced as a first-class lifecycle entity:
   - inviter identity
   - existing user target and/or external target
   - channel/type
   - invite token
   - expiry
   - status transitions (`pending`, `accepted`, `declined`, `revoked`, `expired`)
   - lifecycle timestamps
4. `circle_invitation_events` is introduced for auditability of transition history.
5. Canonical RPC/service entry points are added for:
   - my circles
   - shared-with-me
   - pending invites
   - invitable user search
   - invite create/accept/decline/revoke
   - member listing and role/member management

## Reuse vs Replace

## Reused

- Existing tables: `circles`, `circle_members`, `profiles` (extended via secure RPC exposure).
- Existing personal circle compatibility flow:
  - `ensure_personal_circle`, `ensure_prayer_circle`, `ensure_events_circle`
  - legacy prayer/events circle member APIs retained via compatibility wrappers.
- Existing deep-link approach (`invite token` support built into canonical model).
- Existing shared solo system; membership gate function is updated to respect new membership status.

## Replaced / Deprecated (Compatibility retained)

- Direct owner-centric add/remove semantics are deprecated in favor of canonical invitation + role model.
- Broad authenticated reads on circles/memberships are removed and replaced with least-privilege policies.
- Legacy prayer/events member RPCs become compatibility adapters over canonical membership behavior.

## Migration Strategy

1. Additive schema changes first (new columns/tables/types/functions).
2. Backfill existing memberships safely:
   - default existing members to active/member
   - ensure creator has active owner membership
3. Introduce canonical RPCs without removing legacy RPC signatures.
4. Tighten RLS after canonical RPCs exist.
5. Keep legacy mobile flows working through wrappers while exposing new service APIs for upcoming UX pass.

## Compatibility Assumptions

1. Existing prayer/events circle screens still call legacy APIs during UX transition.
2. Legacy circle membership operations continue to work, now backed by status-aware membership rows.
3. Existing profile RLS remains strict; search/member display uses controlled security-definer RPC output.
4. Existing data is preserved; no destructive renames or hard table replacements in this phase.

## Verification Corrections (2026-03-08)

1. `hash_external_contact` must call `extensions.digest(...)` instead of unqualified `digest(...)` so invite creation works under Supabase extension schema/search-path behavior.
2. `accept_circle_invite` must upsert memberships with `on conflict on constraint circle_members_pkey` to avoid PL/pgSQL output-column name ambiguity in the `returns table` function.
3. The SQL integration test harness (`phase_2a_circle_collaboration.sql`) requires explicit temp-table privileges before `set local role authenticated`; `_phase2a_ctx` is now granted to `authenticated`.
4. Forward-fix migration `20260308123000_phase_2a_circle_collaboration_fixes.sql` is added so already-migrated environments receive the function fixes without requiring historical migration edits.
