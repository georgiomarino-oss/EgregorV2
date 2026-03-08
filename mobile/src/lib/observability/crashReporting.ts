import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

type Primitive = boolean | number | string | null;

let crashReportingInitialized = false;

function resolveReleaseMetadata() {
  const appVersion = Constants.expoConfig?.version?.trim() || '0.0.0';
  const buildNumber = Constants.nativeBuildVersion?.trim() || '0';
  return {
    appVersion,
    buildNumber,
    release: `egregor-mobile@${appVersion}+${buildNumber}`,
  };
}

function resolveCrashEnvironment() {
  const configured = process.env.EXPO_PUBLIC_RELEASE_ENV?.trim();
  if (configured) {
    return configured;
  }

  return __DEV__ ? 'development' : 'production';
}

export function isCrashReportingEnabled() {
  return crashReportingInitialized;
}

export function initializeCrashReporting() {
  if (crashReportingInitialized) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  const { appVersion, buildNumber, release } = resolveReleaseMetadata();

  Sentry.init({
    dsn,
    dist: buildNumber,
    enableAutoSessionTracking: true,
    enableNativeFramesTracking: !__DEV__,
    environment: resolveCrashEnvironment(),
    release,
    tracesSampleRate: __DEV__ ? 0 : 0.05,
  });

  Sentry.setTag('platform', Platform.OS);
  Sentry.setTag('app_version', appVersion);
  Sentry.setTag('native_build', buildNumber);
  crashReportingInitialized = true;
}

export function setCrashReportingUser(userId: string | null) {
  if (!crashReportingInitialized) {
    return;
  }

  const normalizedUserId = userId?.trim() || null;
  Sentry.setUser(normalizedUserId ? { id: normalizedUserId } : null);
}

export function addCrashBreadcrumb(input: {
  category: string;
  data?: Record<string, Primitive>;
  message: string;
}) {
  if (!crashReportingInitialized) {
    return;
  }

  const breadcrumb: Sentry.Breadcrumb = {
    category: input.category,
    level: 'info',
    message: input.message,
  };

  if (input.data) {
    breadcrumb.data = input.data;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

export function captureAppException(
  error: unknown,
  context: string,
  extras?: Record<string, Primitive>,
) {
  const resolvedError =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown application error.');

  if (!crashReportingInitialized) {
    if (__DEV__) {
      console.warn(`[Egregor][${context}]`, resolvedError.message);
    }
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('context', context);
    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(resolvedError);
  });
}
