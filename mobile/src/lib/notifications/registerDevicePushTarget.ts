import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { registerDevicePushTarget } from '../api/notifications';

const PUSH_INSTALLATION_ID_STORAGE_KEY = 'egregor.push.installation_id.v1';

export type DeviceNotificationPermissionState =
  | 'denied'
  | 'granted'
  | 'undetermined'
  | 'unsupported';

interface RegisterCurrentDevicePushTargetOptions {
  registrationSource?: string;
  requestPermission?: boolean;
}

interface PermissionRequestRegistrationResult {
  deviceTarget: Awaited<ReturnType<typeof registerCurrentDevicePushTarget>>;
  permissionState: DeviceNotificationPermissionState;
}

function generateInstallationId() {
  return `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateInstallationId() {
  const cached = (await AsyncStorage.getItem(PUSH_INSTALLATION_ID_STORAGE_KEY))?.trim() || '';
  if (cached) {
    return cached;
  }

  const nextId = generateInstallationId();
  await AsyncStorage.setItem(PUSH_INSTALLATION_ID_STORAGE_KEY, nextId);
  return nextId;
}

function resolvePushProjectId() {
  return (
    Constants.easConfig?.projectId ??
    ((Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ?? null)
  );
}

function resolveLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
}

function resolveTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function toPermissionState(status: string): DeviceNotificationPermissionState {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  if (status === 'undetermined') {
    return 'undetermined';
  }
  return 'unsupported';
}

export async function getDeviceNotificationPermissionState(): Promise<DeviceNotificationPermissionState> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return 'unsupported';
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  return toPermissionState(currentPermission.status);
}

export async function registerCurrentDevicePushTarget(
  options: RegisterCurrentDevicePushTargetOptions = {},
) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  const requestPermission = options.requestPermission === true;
  let permissionState = await getDeviceNotificationPermissionState();

  if (permissionState !== 'granted' && requestPermission) {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    permissionState = toPermissionState(requestedPermission.status);
  }

  if (permissionState !== 'granted') {
    return null;
  }

  const projectId = resolvePushProjectId();
  const pushTokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const deviceToken = pushTokenResult.data.trim();

  if (!deviceToken) {
    return null;
  }

  const installationId = await getOrCreateInstallationId();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const appVersion = Constants.expoConfig?.version ?? null;
  const buildNumber = Constants.nativeBuildVersion ?? null;
  const deviceName = Constants.deviceName ?? null;
  const locale = resolveLocale();
  const timezone = resolveTimezone();

  const payload: Parameters<typeof registerDevicePushTarget>[0] = {
    deviceToken,
    installationId,
    metadata: {
      registrationSource: options.registrationSource ?? 'background_sync',
    },
    platform,
    pushProvider: 'expo',
  };

  if (appVersion) {
    payload.appVersion = appVersion;
  }
  if (buildNumber) {
    payload.buildNumber = buildNumber;
  }
  if (deviceName) {
    payload.deviceName = deviceName;
  }
  if (locale) {
    payload.locale = locale;
  }
  if (timezone) {
    payload.timezone = timezone;
  }

  return registerDevicePushTarget(payload);
}

export async function requestNotificationPermissionAndRegisterCurrentDevice(
  options: Pick<RegisterCurrentDevicePushTargetOptions, 'registrationSource'> = {},
): Promise<PermissionRequestRegistrationResult> {
  const deviceTarget = await registerCurrentDevicePushTarget({
    registrationSource: options.registrationSource ?? 'contextual_prompt',
    requestPermission: true,
  });

  const permissionState = await getDeviceNotificationPermissionState();
  return {
    deviceTarget,
    permissionState,
  };
}

export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    throw new Error('Unable to open system notification settings.');
  }
}
