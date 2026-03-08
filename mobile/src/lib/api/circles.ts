import { supabase } from '../supabase';

export type CircleMembershipRole = 'owner' | 'steward' | 'member';
export type CircleMembershipStatus = 'pending' | 'active' | 'removed';
export type CircleInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type CircleInviteChannel = 'in_app' | 'link' | 'email' | 'sms';

interface CircleSummaryRow {
  circle_id: string;
  created_at: string;
  created_by: string;
  description: string | null;
  is_owner: boolean;
  is_shared_with_me: boolean;
  joined_at: string;
  membership_role: CircleMembershipRole;
  membership_status: CircleMembershipStatus;
  name: string;
  visibility: string;
}

interface CircleInviteRow {
  channel: CircleInviteChannel;
  circle_description: string | null;
  circle_id: string;
  circle_name: string;
  created_at: string;
  expires_at: string;
  invitation_id: string;
  invite_token: string;
  inviter_display_name: string | null;
  inviter_user_id: string;
  role_to_grant: CircleMembershipRole;
  status: CircleInviteStatus;
  target_contact_label: string | null;
  target_user_id: string | null;
}

interface CircleInviteMutationRow {
  channel: CircleInviteChannel;
  circle_id: string;
  created_at: string;
  expires_at: string;
  invitation_id: string;
  invite_token: string;
  inviter_user_id: string;
  role_to_grant: CircleMembershipRole;
  status: CircleInviteStatus;
  target_contact_label: string | null;
  target_user_id: string | null;
}

interface CircleInviteAcceptRow {
  circle_id: string;
  invitation_id: string;
  membership_role: CircleMembershipRole;
  membership_status: CircleMembershipStatus;
}

interface CircleMemberRow {
  display_name: string | null;
  is_owner: boolean;
  joined_at: string;
  role: CircleMembershipRole;
  status: CircleMembershipStatus;
  user_id: string;
}

interface InvitableUserRow {
  display_name: string | null;
  user_id: string;
}

export interface CanonicalCircleSummary {
  circleId: string;
  createdAt: string;
  createdBy: string;
  description: string | null;
  isOwner: boolean;
  isSharedWithMe: boolean;
  joinedAt: string;
  membershipRole: CircleMembershipRole;
  membershipStatus: CircleMembershipStatus;
  name: string;
  visibility: string;
}

export interface CircleInviteSummary {
  channel: CircleInviteChannel;
  circleDescription: string | null;
  circleId: string;
  circleName: string;
  createdAt: string;
  expiresAt: string;
  invitationId: string;
  inviteToken: string;
  inviterDisplayName: string;
  inviterUserId: string;
  roleToGrant: CircleMembershipRole;
  status: CircleInviteStatus;
  targetContactLabel: string | null;
  targetUserId: string | null;
}

export interface CircleInviteMutationResult {
  channel: CircleInviteChannel;
  circleId: string;
  createdAt: string;
  expiresAt: string;
  invitationId: string;
  inviteToken: string;
  inviterUserId: string;
  roleToGrant: CircleMembershipRole;
  status: CircleInviteStatus;
  targetContactLabel: string | null;
  targetUserId: string | null;
}

export interface CircleInviteAcceptResult {
  circleId: string;
  invitationId: string;
  membershipRole: CircleMembershipRole;
  membershipStatus: CircleMembershipStatus;
}

export interface CircleMemberRecord {
  displayName: string;
  isOwner: boolean;
  joinedAt: string;
  role: CircleMembershipRole;
  status: CircleMembershipStatus;
  userId: string;
}

export interface InvitableUser {
  displayName: string;
  userId: string;
}

export interface LegacyPrayerCircleMember {
  displayName: string;
  isOwner: boolean;
  joinedAt: string;
  userId: string;
}

export interface LegacyPrayerCircleUserSuggestion {
  displayName: string;
  userId: string;
}

function toSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function normalizeLimit(limit?: number, fallback = 20) {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.round(limit), 50));
}

function mapCircleSummary(row: CircleSummaryRow): CanonicalCircleSummary {
  return {
    circleId: row.circle_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    description: row.description,
    isOwner: Boolean(row.is_owner),
    isSharedWithMe: Boolean(row.is_shared_with_me),
    joinedAt: row.joined_at,
    membershipRole: row.membership_role,
    membershipStatus: row.membership_status,
    name: row.name,
    visibility: row.visibility,
  };
}

function mapCircleInviteSummary(row: CircleInviteRow): CircleInviteSummary {
  return {
    channel: row.channel,
    circleDescription: row.circle_description,
    circleId: row.circle_id,
    circleName: row.circle_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    invitationId: row.invitation_id,
    inviteToken: row.invite_token,
    inviterDisplayName: row.inviter_display_name?.trim() || 'Member',
    inviterUserId: row.inviter_user_id,
    roleToGrant: row.role_to_grant,
    status: row.status,
    targetContactLabel: row.target_contact_label,
    targetUserId: row.target_user_id,
  };
}

function mapCircleInviteMutation(row: CircleInviteMutationRow): CircleInviteMutationResult {
  return {
    channel: row.channel,
    circleId: row.circle_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    invitationId: row.invitation_id,
    inviteToken: row.invite_token,
    inviterUserId: row.inviter_user_id,
    roleToGrant: row.role_to_grant,
    status: row.status,
    targetContactLabel: row.target_contact_label,
    targetUserId: row.target_user_id,
  };
}

export async function listMyCircles(): Promise<CanonicalCircleSummary[]> {
  const { data, error } = await supabase.rpc('list_my_circles');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load circles.'));
  }
  return ((data ?? []) as CircleSummaryRow[]).map(mapCircleSummary);
}

export async function listSharedWithMe(): Promise<CanonicalCircleSummary[]> {
  const { data, error } = await supabase.rpc('list_shared_with_me');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load shared circles.'));
  }
  return ((data ?? []) as CircleSummaryRow[]).map(mapCircleSummary);
}

export async function listPendingCircleInvites(): Promise<CircleInviteSummary[]> {
  const { data, error } = await supabase.rpc('list_pending_circle_invites');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load pending invites.'));
  }
  return ((data ?? []) as CircleInviteRow[]).map(mapCircleInviteSummary);
}

export async function searchInvitableUsers(input: {
  circleId: string;
  limit?: number;
  query?: string;
}): Promise<InvitableUser[]> {
  const circleId = input.circleId.trim();
  if (!circleId) {
    throw new Error('Circle is required for user search.');
  }

  const { data, error } = await supabase.rpc('search_invitable_users', {
    p_circle_id: circleId,
    p_limit: normalizeLimit(input.limit, 20),
    p_query: input.query?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to search users.'));
  }

  return ((data ?? []) as InvitableUserRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    userId: row.user_id,
  }));
}

export async function createCircleInvite(input: {
  channel?: CircleInviteChannel;
  circleId: string;
  expiresAt?: string;
  roleToGrant?: CircleMembershipRole;
  targetContact?: string;
  targetUserId?: string;
}): Promise<CircleInviteMutationResult> {
  const circleId = input.circleId.trim();
  if (!circleId) {
    throw new Error('Circle is required.');
  }

  const { data, error } = await supabase.rpc('create_circle_invite', {
    p_channel: input.channel ?? 'in_app',
    p_circle_id: circleId,
    p_expires_at: input.expiresAt ?? null,
    p_role_to_grant: input.roleToGrant ?? 'member',
    p_target_contact: input.targetContact?.trim() || null,
    p_target_user_id: input.targetUserId?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to create invite.'));
  }

  const row = ((data ?? []) as CircleInviteMutationRow[])[0];
  if (!row) {
    throw new Error('Invite was not returned by the server.');
  }

  return mapCircleInviteMutation(row);
}

export async function acceptCircleInvite(input: {
  invitationId?: string;
  inviteToken?: string;
}): Promise<CircleInviteAcceptResult> {
  const invitationId = input.invitationId?.trim() || null;
  const inviteToken = input.inviteToken?.trim() || null;
  if (!invitationId && !inviteToken) {
    throw new Error('Invitation id or token is required.');
  }

  const { data, error } = await supabase.rpc('accept_circle_invite', {
    p_invitation_id: invitationId,
    p_invite_token: inviteToken,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to accept invite.'));
  }

  const row = ((data ?? []) as CircleInviteAcceptRow[])[0];
  if (!row) {
    throw new Error('Invite acceptance did not return membership state.');
  }

  return {
    circleId: row.circle_id,
    invitationId: row.invitation_id,
    membershipRole: row.membership_role,
    membershipStatus: row.membership_status,
  };
}

export async function declineCircleInvite(input: {
  invitationId?: string;
  inviteToken?: string;
  reason?: string;
}) {
  const invitationId = input.invitationId?.trim() || null;
  const inviteToken = input.inviteToken?.trim() || null;
  if (!invitationId && !inviteToken) {
    throw new Error('Invitation id or token is required.');
  }

  const { error } = await supabase.rpc('decline_circle_invite', {
    p_invitation_id: invitationId,
    p_invite_token: inviteToken,
    p_reason: input.reason?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to decline invite.'));
  }
}

export async function revokeCircleInvite(input: {
  invitationId: string;
  reason?: string;
}) {
  const invitationId = input.invitationId.trim();
  if (!invitationId) {
    throw new Error('Invitation id is required.');
  }

  const { error } = await supabase.rpc('revoke_circle_invite', {
    p_invitation_id: invitationId,
    p_reason: input.reason?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to revoke invite.'));
  }
}

export async function listCircleMembers(circleId: string): Promise<CircleMemberRecord[]> {
  const normalizedCircleId = circleId.trim();
  if (!normalizedCircleId) {
    throw new Error('Circle is required.');
  }

  const { data, error } = await supabase.rpc('list_circle_members', {
    p_circle_id: normalizedCircleId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load circle members.'));
  }

  return ((data ?? []) as CircleMemberRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    isOwner: Boolean(row.is_owner),
    joinedAt: row.joined_at,
    role: row.role,
    status: row.status,
    userId: row.user_id,
  }));
}

export async function updateCircleMemberRole(input: {
  circleId: string;
  role: CircleMembershipRole;
  targetUserId: string;
}) {
  const circleId = input.circleId.trim();
  const targetUserId = input.targetUserId.trim();
  if (!circleId || !targetUserId) {
    throw new Error('Circle and target user are required.');
  }

  const { error } = await supabase.rpc('update_circle_member_role', {
    p_circle_id: circleId,
    p_role: input.role,
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update member role.'));
  }
}

export async function removeCircleMember(input: { circleId: string; targetUserId: string }) {
  const circleId = input.circleId.trim();
  const targetUserId = input.targetUserId.trim();
  if (!circleId || !targetUserId) {
    throw new Error('Circle and target user are required.');
  }

  const { error } = await supabase.rpc('remove_circle_member', {
    p_circle_id: circleId,
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove circle member.'));
  }
}

// Legacy compatibility adapters for existing Prayer/Events Circle screens.
export async function fetchPrayerCircleMembersLegacy(): Promise<LegacyPrayerCircleMember[]> {
  const { data, error } = await supabase.rpc('get_prayer_circle_members');

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load prayer circle members.'));
  }

  return ((data ?? []) as CircleMemberRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    isOwner: Boolean(row.is_owner),
    joinedAt: row.joined_at,
    userId: row.user_id,
  }));
}

export async function fetchEventsCircleMembersLegacy(): Promise<LegacyPrayerCircleMember[]> {
  const { data, error } = await supabase.rpc('get_events_circle_members');

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load events circle members.'));
  }

  return ((data ?? []) as CircleMemberRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    isOwner: Boolean(row.is_owner),
    joinedAt: row.joined_at,
    userId: row.user_id,
  }));
}

export async function searchUsersForPrayerCircleLegacy(
  query: string,
  limit = 20,
): Promise<LegacyPrayerCircleUserSuggestion[]> {
  const { data, error } = await supabase.rpc('search_app_users_for_circle', {
    p_limit: normalizeLimit(limit, 20),
    p_query: query.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to search users.'));
  }

  return ((data ?? []) as InvitableUserRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    userId: row.user_id,
  }));
}

export async function addPrayerCircleMemberLegacy(targetUserId: string) {
  const { error } = await supabase.rpc('add_user_to_prayer_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to add user to prayer circle.'));
  }
}

export async function addEventsCircleMemberLegacy(targetUserId: string) {
  const { error } = await supabase.rpc('add_user_to_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to add user to events circle.'));
  }
}

export async function removePrayerCircleMemberLegacy(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_prayer_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from prayer circle.'));
  }
}

export async function removeEventsCircleMemberLegacy(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from events circle.'));
  }
}
