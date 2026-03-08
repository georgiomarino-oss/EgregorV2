# Phase 3B Verification Report

Date: 2026-03-08  
Scope: Verification and narrow cleanup pass for Phase 3B Live UX integration on canonical event-domain APIs.

## Verification Approach

1. Reviewed redesign source docs for IA and language requirements.
2. Audited the concrete Phase 3B implementation files end-to-end.
3. Ran compile verification and added a focused logic test layer for critical pure logic.
4. Applied only targeted fixes for canonical routing integrity, naming consistency, and primary-flow correctness.

## What Was Verified

## IA / Naming Consistency

1. Bottom tab user-facing label is `Live` (route key remains `EventsTab` for compatibility).
2. Live surface copy and header language are aligned to Live terminology in primary paths.

## Canonical Feed / Sections

1. Primary feed source is canonical occurrences via `listEventFeed` in `useEventsData`.
2. Section model in `buildLiveFeedSections` includes:
   - Live Now
   - Next 24 Hours
   - 11:11
   - My Circles
   - Global Flagships
   - Saved / Reminded
3. Primary cards map to canonical occurrence/room targets.

## CTA / Join Integrity

1. Live and waiting-room CTAs route to `EventRoom` with canonical occurrence identity.
2. Upcoming/ended CTAs route to `EventDetails` with canonical occurrence/room context.

## Deep Link / Canonical Target Handling

1. Invite parser canonical precedence is enforced for `events/room` links when both legacy and canonical params are present.
2. Canonical deep-link targets are recognized (`live/occurrence/:id`, `room/:id`).
3. Authenticated-link path mapping is now aligned in navigation linking config.

## Presence / Participant Semantics

1. Primary feed/presence signals use canonical presence APIs (`list_active_occurrence_presence` via data layer).
2. Room participant count refresh uses canonical room snapshot/presence paths in primary flow.

## Regressions Found

1. Authenticated canonical deep links were not fully mapped in app linking config (`AppRoot` only mapped `events/*` paths).
2. `EventRoomScreen` hydration path could consume route script fallback before canonical snapshot resolution, allowing a pseudo-style fallback to run ahead of canonical validation in some cases.
3. Remaining user-facing copy in room/card accessibility and invite text still used inconsistent `event` naming in Live contexts.
4. `EventDetailsScreen` join-target normalization could over-merge legacy `eventId` into `occurrenceId`, creating avoidable ambiguity.
5. Header `next24HoursCount` was counting all upcoming items rather than the actual `Next 24 Hours` section.
6. `buildEventInviteUrl` continued to generate legacy `events/room` URLs even when canonical `roomId`/`occurrenceId` was available.

## Fixes Made

1. Added canonical deep-link paths to app linking config:
   - `live/occurrence/:occurrenceId` for `EventDetails`
   - `room/:roomId` for `EventRoom`
2. Reordered `EventRoomScreen` hydration so canonical join-target snapshot resolves first; script/template fallback now applies only when no join target is present.
3. Updated user-facing Live wording in key room/card/invite strings for IA consistency.
4. Tightened `EventDetailsScreen` join-target normalization to avoid implicit `eventId -> occurrenceId` mapping.
5. Tightened `normalizeEventJoinTarget` string handling in data layer to reduce legacy/canonical ambiguity.
6. Corrected `next24HoursCount` to use the canonical `next_24_hours` section length.
7. Updated invite URL generation to prefer canonical deep links:
   - `egregorv2://room/:roomId`
   - `egregorv2://live/occurrence/:occurrenceId`
   while retaining legacy `events/room` fallback when canonical IDs are unavailable.
8. Updated invite/share user-facing copy from "live ... event" to "live ... room" for IA consistency.

## Targeted Tests Added

Added a focused runnable test slice for highest-value pure logic:

1. Live state classification (`resolveLiveOccurrenceState`)
2. Live section classification (`buildLiveFeedSections`)
3. Canonical target precedence in link parsing (`parseInviteCaptureTarget`)
4. Canonical invite link generation preference (`buildEventInviteUrl`)

Files:

- `mobile/tests/phase3b-live-model.test.cts`
- `mobile/scripts/run-phase3b-live-tests.mjs`
- `mobile/package.json` script: `test:phase3b-live`

## Test / Verification Results

1. `npm --prefix mobile run typecheck` -> passed
2. `npm --prefix mobile run test:phase3b-live` -> passed (4/4 tests)

## IA Consistency Status

User-facing IA/naming is consistent with the redesign intent for primary Live surfaces:

1. Navigation/tab naming uses `Live`.
2. Primary screen copy and CTAs describe Live rooms and waiting-room states coherently.
3. Canonical occurrence/room terminology remains internal and implementation-facing.

## Remaining Known Risks Before Cinematic Pass

1. `EventRoomScreen` remains structurally large and still contains compatibility branches (legacy/template fallback retained intentionally outside primary flow).
2. Full end-to-end UI automation is still limited; current confidence is from compile + targeted logic tests + code-path verification.
3. Data layer still contains migration-era legacy fallback paths for backend-unavailable scenarios; canonical paths remain primary when Phase 3A backend is present.
