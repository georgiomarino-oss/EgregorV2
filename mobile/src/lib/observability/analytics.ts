import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '../supabase';
import { addCrashBreadcrumb, captureAppException } from './crashReporting';

export const MOBILE_ANALYTICS_EVENTS = {
  ACCOUNT_DELETION_REQUESTED: 'account_deletion_requested',
  AUTH_ENTRY_VIEWED: 'auth_entry_viewed',
  AUTH_MODE_SWITCHED: 'auth_mode_switched',
  AUTH_SESSION_ACTIVE: 'auth_session_active',
  AUTH_SUBMIT_FAILED: 'auth_submit_failed',
  AUTH_SUBMIT_STARTED: 'auth_submit_started',
  AUTH_SUBMIT_SUCCEEDED: 'auth_submit_succeeded',
  CIRCLE_INVITE_ACCEPTED: 'circle_invite_accepted',
  CIRCLE_INVITE_CREATED: 'circle_invite_created',
  CIRCLE_INVITE_DECLINED: 'circle_invite_declined',
  CIRCLE_INVITE_REVOKED: 'circle_invite_revoked',
  CIRCLE_INVITE_VIEWED: 'circle_invite_viewed',
  LIVE_DETAILS_JOIN_PRESSED: 'live_details_join_pressed',
  LIVE_DETAILS_VIEWED: 'live_details_viewed',
  LIVE_REMINDER_TOGGLED: 'live_reminder_toggled',
  NOTIFICATION_PERMISSION_RESULT: 'notification_permission_result',
  NOTIFICATION_PERMISSION_TRIGGERED: 'notification_permission_triggered',
  ROOM_JOIN_FAILED: 'room_join_failed',
  ROOM_JOIN_SUCCEEDED: 'room_join_succeeded',
  ROOM_REMINDER_TOGGLED: 'room_reminder_toggled',
  TRUST_ACTION_BLOCK: 'trust_action_block',
  TRUST_ACTION_REPORT: 'trust_action_report',
  TRUST_ACTION_UNBLOCK: 'trust_action_unblock',
} as const;

export type MobileAnalyticsEventName =
  (typeof MOBILE_ANALYTICS_EVENTS)[keyof typeof MOBILE_ANALYTICS_EVENTS];

type Primitive = boolean | number | string | null;
type AnalyticsProperties = Record<string, Primitive>;

const analyticsSessionId = `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let analyticsUserId: string | null = null;

function coercePropertyValue(value: unknown): Primitive {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return `${value}`;
}

function normalizeProperties(properties?: Record<string, unknown>): AnalyticsProperties {
  if (!properties) {
    return {};
  }

  return Object.entries(properties).reduce<AnalyticsProperties>((accumulator, [key, value]) => {
    if (!key.trim()) {
      return accumulator;
    }

    accumulator[key] = coercePropertyValue(value);
    return accumulator;
  }, {});
}

function resolveRuntimeAnalyticsContext() {
  return {
    app_version: Constants.expoConfig?.version?.trim() || null,
    build_number: Constants.nativeBuildVersion?.trim() || null,
    platform: Platform.OS,
    session_id: analyticsSessionId,
    user_state: analyticsUserId ? 'authenticated' : 'anonymous',
  };
}

export function setAnalyticsUser(userId: string | null) {
  analyticsUserId = userId?.trim() || null;
}

export function trackMobileEvent(
  eventName: MobileAnalyticsEventName,
  properties?: Record<string, unknown>,
) {
  const payload = {
    ...normalizeProperties(properties),
    ...resolveRuntimeAnalyticsContext(),
  };

  addCrashBreadcrumb({
    category: 'analytics',
    data: payload,
    message: eventName,
  });

  void (async () => {
    try {
      const { error } = await supabase.rpc('track_mobile_analytics_event', {
        p_app_version: payload.app_version,
        p_build_number: payload.build_number,
        p_event_name: eventName,
        p_event_properties: payload,
        p_event_source: 'mobile_app',
        p_platform: payload.platform,
        p_session_id: payload.session_id,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      captureAppException(error, 'analytics.track_mobile_event', {
        event_name: eventName,
      });
    }
  })();
}
