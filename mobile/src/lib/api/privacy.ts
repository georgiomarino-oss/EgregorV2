import { supabase } from '../supabase';
import { toSupabaseErrorMessage } from './errors';

export type PrivacyVisibility = 'circles_only' | 'hidden' | 'public';

interface PrivacySettingsRow {
  allow_circle_invites: boolean;
  allow_direct_invites: boolean;
  live_presence_visibility: PrivacyVisibility;
  member_list_visibility: PrivacyVisibility;
  updated_at: string;
  user_id: string;
}

export interface PrivacySettings {
  allowCircleInvites: boolean;
  allowDirectInvites: boolean;
  livePresenceVisibility: PrivacyVisibility;
  memberListVisibility: PrivacyVisibility;
  updatedAt: string;
  userId: string;
}

interface UpdatePrivacySettingsInput {
  allowCircleInvites?: boolean;
  allowDirectInvites?: boolean;
  livePresenceVisibility?: PrivacyVisibility;
  memberListVisibility?: PrivacyVisibility;
}

function mapPrivacySettings(row: PrivacySettingsRow): PrivacySettings {
  return {
    allowCircleInvites: row.allow_circle_invites,
    allowDirectInvites: row.allow_direct_invites,
    livePresenceVisibility: row.live_presence_visibility,
    memberListVisibility: row.member_list_visibility,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const { data, error } = await supabase.rpc('get_my_privacy_settings');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load privacy settings.'));
  }

  const row = ((data ?? []) as PrivacySettingsRow[])[0];
  if (!row) {
    throw new Error('Privacy settings were not returned by the server.');
  }

  return mapPrivacySettings(row);
}

export async function updatePrivacySettings(
  input: UpdatePrivacySettingsInput,
): Promise<PrivacySettings> {
  const { data, error } = await supabase.rpc('update_my_privacy_settings', {
    p_allow_circle_invites:
      typeof input.allowCircleInvites === 'boolean' ? input.allowCircleInvites : null,
    p_allow_direct_invites:
      typeof input.allowDirectInvites === 'boolean' ? input.allowDirectInvites : null,
    p_live_presence_visibility: input.livePresenceVisibility ?? null,
    p_member_list_visibility: input.memberListVisibility ?? null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update privacy settings.'));
  }

  const row = ((data ?? []) as PrivacySettingsRow[])[0];
  if (!row) {
    throw new Error('Privacy settings update returned no data.');
  }

  return mapPrivacySettings(row);
}
