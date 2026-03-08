import { supabase } from '../supabase';
import { toSupabaseErrorMessage } from './errors';

export type ModerationTargetType = 'circle' | 'event_occurrence' | 'invite' | 'room' | 'user';
export type ModerationReasonCode = 'abuse' | 'harassment' | 'other' | 'self_harm_concern' | 'spam';

interface BlockRow {
  blocked_user_id: string;
  blocked_display_name: string;
  blocked_at: string;
  reason: string | null;
}

interface BlockMutationRow {
  blocked_user_id: string;
  blocker_user_id: string;
  created_at: string;
  reason: string | null;
  updated_at: string;
}

interface ModerationReportRow {
  created_at: string;
  report_id: string;
  status: string;
}

export interface BlockRecord {
  blockedAt: string;
  blockedDisplayName: string;
  blockedUserId: string;
  reason: string | null;
}

export interface BlockMutationResult {
  blockedUserId: string;
  blockerUserId: string;
  createdAt: string;
  reason: string | null;
  updatedAt: string;
}

export interface ModerationReportResult {
  createdAt: string;
  reportId: string;
  status: string;
}

export async function blockUser(input: {
  reason?: string;
  targetUserId: string;
}): Promise<BlockMutationResult> {
  const targetUserId = input.targetUserId.trim();
  if (!targetUserId) {
    throw new Error('Target user is required.');
  }

  const { data, error } = await supabase.rpc('block_user', {
    p_blocked_user_id: targetUserId,
    p_reason: input.reason?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to block user.'));
  }

  const row = ((data ?? []) as BlockMutationRow[])[0];
  if (!row) {
    throw new Error('Block action returned no result.');
  }

  return {
    blockedUserId: row.blocked_user_id,
    blockerUserId: row.blocker_user_id,
    createdAt: row.created_at,
    reason: row.reason,
    updatedAt: row.updated_at,
  };
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const normalizedUserId = targetUserId.trim();
  if (!normalizedUserId) {
    throw new Error('Target user is required.');
  }

  const { error } = await supabase.rpc('unblock_user', {
    p_blocked_user_id: normalizedUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to unblock user.'));
  }
}

export async function listBlockedUsers(): Promise<BlockRecord[]> {
  const { data, error } = await supabase.rpc('list_my_blocks');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load blocked users.'));
  }

  return ((data ?? []) as BlockRow[]).map((row) => ({
    blockedAt: row.blocked_at,
    blockedDisplayName: row.blocked_display_name,
    blockedUserId: row.blocked_user_id,
    reason: row.reason,
  }));
}

export async function submitModerationReport(input: {
  details?: string;
  evidence?: Record<string, unknown>;
  reasonCode: ModerationReasonCode;
  supportMetadata?: Record<string, unknown>;
  supportRoute?: string;
  targetId: string;
  targetType: ModerationTargetType;
}): Promise<ModerationReportResult> {
  const targetId = input.targetId.trim();
  if (!targetId) {
    throw new Error('Report target id is required.');
  }

  const { data, error } = await supabase.rpc('submit_moderation_report', {
    p_details: input.details?.trim() || null,
    p_evidence: input.evidence ?? {},
    p_reason_code: input.reasonCode,
    p_support_metadata: input.supportMetadata ?? {},
    p_support_route: input.supportRoute?.trim() || null,
    p_target_id: targetId,
    p_target_type: input.targetType,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to submit report.'));
  }

  const row = ((data ?? []) as ModerationReportRow[])[0];
  if (!row) {
    throw new Error('Moderation report submission returned no result.');
  }

  return {
    createdAt: row.created_at,
    reportId: row.report_id,
    status: row.status,
  };
}
