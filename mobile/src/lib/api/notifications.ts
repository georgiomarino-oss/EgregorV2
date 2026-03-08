import { supabase } from '../supabase';
import { toSupabaseErrorMessage } from './errors';

export type NotificationChannel = 'email' | 'in_app' | 'push';
export type NotificationTargetType =
  | 'circle'
  | 'circle_invite'
  | 'event_occurrence'
  | 'global'
  | 'room';
export type NotificationCategory =
  | 'circle_event'
  | 'circle_social'
  | 'daily_rhythm'
  | 'emergency'
  | 'global_moment'
  | 'invite'
  | 'occurrence_reminder'
  | 'room_reminder';

interface DevicePushTargetRow {
  created_at: string;
  device_target_id: string;
  device_token: string;
  disabled_at: string | null;
  installation_id: string;
  platform: 'android' | 'ios' | 'web';
  push_provider: 'apns' | 'expo' | 'fcm' | 'webpush';
  updated_at: string;
  user_id: string;
}

interface NotificationPreferenceRow {
  category: NotificationCategory;
  channel: NotificationChannel;
  created_at?: string;
  enabled: boolean;
  lead_minutes: number;
  metadata: Record<string, unknown> | null;
  quiet_hours: Record<string, unknown> | null;
  subscription_id: string;
  target_id: string | null;
  target_type: NotificationTargetType;
  updated_at: string;
  user_id: string;
}

export interface DevicePushTarget {
  createdAt: string;
  deviceTargetId: string;
  deviceToken: string;
  disabledAt: string | null;
  installationId: string;
  platform: 'android' | 'ios' | 'web';
  pushProvider: 'apns' | 'expo' | 'fcm' | 'webpush';
  updatedAt: string;
  userId: string;
}

export interface NotificationPreference {
  category: NotificationCategory;
  channel: NotificationChannel;
  createdAt: string | null;
  enabled: boolean;
  leadMinutes: number;
  metadata: Record<string, unknown>;
  quietHours: Record<string, unknown>;
  subscriptionId: string;
  targetId: string | null;
  targetType: NotificationTargetType;
  updatedAt: string;
  userId: string;
}

interface RegisterDevicePushTargetInput {
  appVersion?: string;
  buildNumber?: string;
  deviceName?: string;
  deviceToken: string;
  installationId: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  platform: 'android' | 'ios' | 'web';
  pushProvider?: 'apns' | 'expo' | 'fcm' | 'webpush';
  timezone?: string;
}

interface UpdateNotificationPreferencesInput {
  category: NotificationCategory;
  channel?: NotificationChannel;
  enabled: boolean;
  leadMinutes?: number;
  metadata?: Record<string, unknown>;
  quietHours?: Record<string, unknown>;
  targetId?: string;
  targetType?: NotificationTargetType;
}

function mapDevicePushTarget(row: DevicePushTargetRow): DevicePushTarget {
  return {
    createdAt: row.created_at,
    deviceTargetId: row.device_target_id,
    deviceToken: row.device_token,
    disabledAt: row.disabled_at,
    installationId: row.installation_id,
    platform: row.platform,
    pushProvider: row.push_provider,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function mapNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    category: row.category,
    channel: row.channel,
    createdAt: row.created_at ?? null,
    enabled: row.enabled,
    leadMinutes: row.lead_minutes,
    metadata: row.metadata ?? {},
    quietHours: row.quiet_hours ?? {},
    subscriptionId: row.subscription_id,
    targetId: row.target_id,
    targetType: row.target_type,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function registerDevicePushTarget(
  input: RegisterDevicePushTargetInput,
): Promise<DevicePushTarget> {
  const installationId = input.installationId.trim();
  const deviceToken = input.deviceToken.trim();
  if (!installationId || !deviceToken) {
    throw new Error('Installation id and device token are required.');
  }

  const { data, error } = await supabase.rpc('register_device_push_target', {
    p_app_version: input.appVersion?.trim() || null,
    p_build_number: input.buildNumber?.trim() || null,
    p_device_name: input.deviceName?.trim() || null,
    p_device_token: deviceToken,
    p_installation_id: installationId,
    p_locale: input.locale?.trim() || null,
    p_metadata: input.metadata ?? {},
    p_platform: input.platform,
    p_push_provider: input.pushProvider ?? 'expo',
    p_timezone: input.timezone?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to register device push target.'));
  }

  const row = ((data ?? []) as DevicePushTargetRow[])[0];
  if (!row) {
    throw new Error('Device push target registration did not return a record.');
  }

  return mapDevicePushTarget(row);
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreference> {
  const targetType = input.targetType ?? 'global';
  const targetId = input.targetId?.trim() || null;

  const { data, error } = await supabase.rpc('update_notification_subscription', {
    p_category: input.category,
    p_channel: input.channel ?? 'push',
    p_enabled: input.enabled,
    p_lead_minutes: input.leadMinutes ?? 15,
    p_metadata: input.metadata ?? {},
    p_quiet_hours: input.quietHours ?? {},
    p_target_id: targetId,
    p_target_type: targetType,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update notification preference.'));
  }

  const row = ((data ?? []) as NotificationPreferenceRow[])[0];
  if (!row) {
    throw new Error('Notification preference update returned no data.');
  }

  return mapNotificationPreference(row);
}

export async function saveOccurrenceReminderPreference(input: {
  enabled: boolean;
  leadMinutes?: number;
  occurrenceId: string;
}): Promise<NotificationPreference> {
  const occurrenceId = input.occurrenceId.trim();
  if (!occurrenceId) {
    throw new Error('Occurrence id is required.');
  }

  const payload: UpdateNotificationPreferencesInput = {
    category: 'occurrence_reminder',
    enabled: input.enabled,
    targetId: occurrenceId,
    targetType: 'event_occurrence',
  };
  if (typeof input.leadMinutes === 'number') {
    payload.leadMinutes = input.leadMinutes;
  }

  return updateNotificationPreferences(payload);
}

export async function saveRoomReminderPreference(input: {
  enabled: boolean;
  leadMinutes?: number;
  roomId: string;
}): Promise<NotificationPreference> {
  const roomId = input.roomId.trim();
  if (!roomId) {
    throw new Error('Room id is required.');
  }

  const payload: UpdateNotificationPreferencesInput = {
    category: 'room_reminder',
    enabled: input.enabled,
    targetId: roomId,
    targetType: 'room',
  };
  if (typeof input.leadMinutes === 'number') {
    payload.leadMinutes = input.leadMinutes;
  }

  return updateNotificationPreferences(payload);
}

export async function listNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data, error } = await supabase.rpc('list_my_notification_preferences');
  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load notification preferences.'));
  }

  return ((data ?? []) as NotificationPreferenceRow[]).map(mapNotificationPreference);
}
