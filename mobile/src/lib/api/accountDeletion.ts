import { supabase } from '../supabase';
import { toSupabaseErrorMessage } from './errors';

export type AccountDeletionStatus =
  | 'acknowledged'
  | 'cancelled'
  | 'completed'
  | 'in_review'
  | 'rejected'
  | 'requested';

interface AccountDeletionRequestRow {
  request_id: string;
  requested_at: string;
  status: AccountDeletionStatus;
  updated_at: string;
}

interface AccountDeletionStatusRow extends AccountDeletionRequestRow {
  details: string | null;
  reason: string | null;
  support_metadata: Record<string, unknown> | null;
  support_route: string | null;
}

export interface AccountDeletionRequestResult {
  requestId: string;
  requestedAt: string;
  status: AccountDeletionStatus;
  updatedAt: string;
}

export interface AccountDeletionState extends AccountDeletionRequestResult {
  details: string | null;
  reason: string | null;
  supportMetadata: Record<string, unknown>;
  supportRoute: string | null;
}

export async function createAccountDeletionRequest(input?: {
  details?: string;
  reason?: string;
  supportMetadata?: Record<string, unknown>;
  supportRoute?: string;
}): Promise<AccountDeletionRequestResult> {
  const { data, error } = await supabase.rpc('create_account_deletion_request', {
    p_details: input?.details?.trim() || null,
    p_reason: input?.reason?.trim() || null,
    p_support_metadata: input?.supportMetadata ?? {},
    p_support_route: input?.supportRoute?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to create account deletion request.'));
  }

  const row = ((data ?? []) as AccountDeletionRequestRow[])[0];
  if (!row) {
    throw new Error('Account deletion request returned no result.');
  }

  return {
    requestId: row.request_id,
    requestedAt: row.requested_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export async function getAccountDeletionStatus(): Promise<AccountDeletionState | null> {
  const { data, error } = await supabase.rpc('get_account_deletion_status');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load account deletion status.'));
  }

  const row = ((data ?? []) as AccountDeletionStatusRow[])[0];
  if (!row) {
    return null;
  }

  return {
    details: row.details,
    reason: row.reason,
    requestId: row.request_id,
    requestedAt: row.requested_at,
    status: row.status,
    supportMetadata: row.support_metadata ?? {},
    supportRoute: row.support_route,
    updatedAt: row.updated_at,
  };
}
