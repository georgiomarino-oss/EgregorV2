# Phase 2A Manual QA Checklist

Date: 2026-03-08  
Scope: Canonical circles/memberships/invitations backend foundation + service-layer APIs

## Setup

1. Apply all new migrations.
2. Use at least 3 test users:
   - Owner/manager user
   - Existing-user invite target
   - Outsider (not invited, not member)
3. Ensure all users have `profiles.display_name`.

## Core Lifecycle

1. Create/ensure circle as owner.
2. Verify owner has active membership with role `owner`.
3. Create invite for existing user target.
4. Verify invite row has:
   - `status = pending`
   - `invite_token` populated
   - `channel`, `role_to_grant`, `expires_at` populated
5. As invitee, verify `list_pending_circle_invites` shows invite.
6. Accept invite as invitee.
7. Verify:
   - invite `status = accepted`
   - membership row exists with `status = active`
   - `source_invitation_id` set on membership
8. Create another invite and decline it.
9. Verify declined lifecycle timestamps and audit event.
10. Create another invite and revoke it as inviter.
11. Verify revoked lifecycle timestamps and audit event.

## Shared-With-Me Retrieval

1. As invitee, call `list_shared_with_me`.
2. Confirm accepted circle appears.
3. As owner, confirm same circle does not appear in `list_shared_with_me`.

## Role And Membership Boundaries

1. Owner promotes invitee to `steward`.
2. As steward, attempt to promote another user to `owner` or modify owner role.
3. Confirm operation is denied.
4. As steward, remove a `member` role user.
5. Confirm member status transitions to `removed`.
6. Re-add removed member via legacy add function and confirm status returns `active`.

## Privacy / RLS

1. As outsider, verify direct select on target circle returns no rows.
2. As outsider, verify `list_pending_circle_invites` returns no rows.
3. As outsider, attempt to revoke another user's pending invite and confirm denied.
4. As non-member, attempt `list_circle_members` for foreign circle and confirm denied.

## Compatibility (Legacy Paths)

1. Prayer Circle screen path:
   - load members
   - add member
   - remove member
2. Events Circle screen path:
   - load members
   - add member
   - remove member
3. Shared solo join gate still works for active circle members.

## Service-Layer API Sanity

1. Validate each canonical API call succeeds for expected actor:
   - `listMyCircles`
   - `listSharedWithMe`
   - `listPendingCircleInvites`
   - `searchInvitableUsers`
   - `createCircleInvite`
   - `acceptCircleInvite`
   - `declineCircleInvite`
   - `revokeCircleInvite`
   - `listCircleMembers`
   - `updateCircleMemberRole`
   - `removeCircleMember`

## Regression Checks

1. Existing auth/session boot still works.
2. Existing profile summary loads (circle counts reflect active memberships only).
3. Existing deep links and shared solo flow are unaffected.
