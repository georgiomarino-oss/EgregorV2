import { supabase } from '../supabase';
import { toSupabaseErrorMessage } from './errors';

interface DeleteAccountFunctionResponse {
  alreadyDeleted?: boolean;
  deleted?: boolean;
  deletedAt?: string;
  detail?: string;
  error?: string;
  retainedDataSummary?: string;
}

export interface DeleteAccountInput {
  confirmationText?: string;
  requestSource?: string;
  requestedReason?: string;
}

export interface DeleteAccountResult {
  alreadyDeleted: boolean;
  deleted: boolean;
  deletedAt: string | null;
  retainedDataSummary: string | null;
}

export async function deleteAccountPermanently(
  input?: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  const confirmationText = input?.confirmationText?.trim() || 'DELETE';
  const requestSource = input?.requestSource?.trim() || 'in_app_profile_settings';
  const requestedReason = input?.requestedReason?.trim() || 'user_initiated_true_deletion';

  const { data, error } = await supabase.functions.invoke<DeleteAccountFunctionResponse>(
    'delete-account',
    {
      body: {
        confirmationText,
        confirmPermanentDeletion: true,
        requestSource,
        requestedReason,
      },
    },
  );

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to delete account.'));
  }

  if (!data?.deleted) {
    throw new Error(data?.detail || data?.error || 'Account deletion did not complete.');
  }

  return {
    alreadyDeleted: data.alreadyDeleted === true,
    deleted: true,
    deletedAt: data.deletedAt?.trim() || null,
    retainedDataSummary: data.retainedDataSummary?.trim() || null,
  };
}
