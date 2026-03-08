# Phase 2B Manual QA Checklist

Date: 2026-03-08  
Scope: Circles IA/UX integration, invite lifecycle UX, and deep-link token handoff on canonical Phase 2A APIs.

## Setup

1. Use at least 4 accounts:
   - Circle owner
   - Member/invitee
   - Decliner
   - Non-target user
2. Ensure local/backend migrations are applied through `20260308124000`.
3. Seed at least one personal circle for the owner.
4. Ensure all test users have `profiles.display_name`.

## IA And Discoverability

1. Open bottom tabs and confirm labels: `Home`, `Circles`, `Live`, `Profile`.
2. Open `Circles` and confirm first-class segmented access to:
   - `My Circles`
   - `Shared With Me`
   - `Pending Invites`
3. Confirm these surfaces are visible without entering owner-only screens.
4. Confirm no fake counts are shown; counts match list lengths.

## Circles Home States

1. Verify loading state appears before data resolves.
2. Verify retry state appears when network/API fails.
3. Verify empty state copy for:
   - no circles yet
   - no shared circles yet
   - no pending invites
4. Verify refresh action reloads all three sections.

## Existing-User Invite Flow

1. From `CircleDetails`, open `Invite`.
2. In `Invite existing users`, type a query and verify typeahead results from canonical search.
3. Send invite to existing user.
4. Confirm success state indicates pending invite.
5. As invitee, confirm invite appears in `Pending Invites`.

## External Invite Flow

1. In `Invite by link`, enter external contact and create invite.
2. Confirm generated tracked token link is shown.
3. Confirm copy/share actions work.
4. In `CircleDetails`, confirm invite appears in invite records with `pending` status.

## Invite Decision And Token States

1. Open valid pending token link and verify invite decision screen shows:
   - inviter
   - circle name/description
   - role to grant
   - status chip
2. Accept flow:
   - accept invite
   - verify status updates to `accepted`
   - verify `Open circle` navigates to circle details
   - verify circle appears under `Shared With Me`
3. Decline flow:
   - decline invite
   - verify status `declined`
4. Revoke flow:
   - as manager, revoke pending invite
   - as target user, open token and verify status `revoked`
5. Expired flow:
   - open expired token
   - verify state renders as `expired`
6. Invalid flow:
   - open malformed/unknown token
   - verify `Invalid invite` state

## Pre-Auth Token Handoff

1. Fully sign out.
2. Open `egregorv2://invite/:token`.
3. Complete login/signup.
4. Confirm app lands in `Circles -> InviteDecision` for the same token.
5. Confirm user can accept/decline without re-opening the link.

## Circle Details And Permissions

1. Confirm `Active members` count equals active membership list length.
2. Confirm member roles render correctly (`owner`, `steward`, `member`).
3. As owner/steward, verify allowed member management actions work.
4. As non-manager, verify management/invite actions are hidden or denied.
5. Remove a member and verify removed user no longer appears as active.

## Legacy Compatibility Screens

1. Open legacy `PrayerCircle` route and verify it points users to canonical Circles path.
2. Open legacy `EventsCircle` route and verify same compatibility behavior.
3. Confirm these routes do not hide inbound shared memberships.

## Regression Notes

1. Deep links for non-circle flows still resolve (`solo/live`, `events/room`).
2. Auth/session bootstrap remains stable when no invite deep link is present.
3. No direct client-side table writes are introduced for canonical write operations.
