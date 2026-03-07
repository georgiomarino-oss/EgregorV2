import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { AppEntryMoment } from '../../components/AppEntryMoment';
import { prefetchCoreAppData, updateAppUserPresence } from '../../lib/api/data';
import { prefetchEventAndPrayerAudioArtifacts } from '../../lib/artifactPrefetch';
import { parseInviteCaptureTarget } from '../../lib/invite';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/tokens';
import { RootNavigator } from './RootNavigator';
import type { CaptureNavigationTarget } from './types';

interface AuthGateProps {
  captureTarget?: CaptureNavigationTarget;
}

export function AuthGate({ captureTarget }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [pendingInviteTarget, setPendingInviteTarget] = useState<CaptureNavigationTarget | null>(
    null,
  );
  const isAuthenticatedRef = useRef(false);
  const forcedAuthState =
    captureTarget?.root === 'auth' ? false : captureTarget?.root === 'main' ? true : null;

  useEffect(() => {
    isAuthenticatedRef.current = Boolean(session);
  }, [session]);

  useEffect(() => {
    if (captureTarget || forcedAuthState !== null) {
      return;
    }

    let active = true;
    const bufferInviteTarget = (urlValue: string | null | undefined) => {
      if (!urlValue) {
        return;
      }

      const parsedTarget = parseInviteCaptureTarget(urlValue);
      if (!parsedTarget) {
        return;
      }

      setPendingInviteTarget((current) => current ?? parsedTarget);
    };

    void Linking.getInitialURL()
      .then((urlValue) => {
        if (!active || isAuthenticatedRef.current) {
          return;
        }
        bufferInviteTarget(urlValue);
      })
      .catch(() => {
        // Non-blocking invite detection.
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isAuthenticatedRef.current) {
        return;
      }
      bufferInviteTarget(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [captureTarget, forcedAuthState]);

  useEffect(() => {
    if (forcedAuthState !== null) {
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.error('[Egregor] Failed to load session:', error.message);
      }

      setSession(data.session);
      setInitializing(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [forcedAuthState]);

  useEffect(() => {
    if (!session?.user?.id || forcedAuthState !== null) {
      return;
    }

    const userId = session.user.id;
    let active = true;
    const heartbeatIntervalMs = 30_000;

    const heartbeat = async (isOnline: boolean) => {
      try {
        await updateAppUserPresence(userId, isOnline);
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Failed to update app user presence.';
        console.warn('[Egregor] Presence heartbeat failed:', message);
      }
    };

    void heartbeat(true);
    const interval = setInterval(() => {
      void heartbeat(true);
    }, heartbeatIntervalMs);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void heartbeat(true);
        return;
      }
      void heartbeat(false);
    });

    return () => {
      active = false;
      clearInterval(interval);
      appStateSubscription.remove();
      void updateAppUserPresence(userId, false);
    };
  }, [forcedAuthState, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || forcedAuthState !== null) {
      return;
    }

    prefetchCoreAppData(session.user.id);
    prefetchEventAndPrayerAudioArtifacts(session.user.id);
  }, [forcedAuthState, session?.user?.id]);

  const runtimeCaptureTarget =
    captureTarget ?? (session ? (pendingInviteTarget ?? undefined) : undefined);

  useEffect(() => {
    if (!session || !pendingInviteTarget) {
      return;
    }

    const cleanupTimer = setTimeout(() => {
      setPendingInviteTarget(null);
    }, 0);

    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [pendingInviteTarget, session]);

  if (forcedAuthState !== null) {
    return (
      <RootNavigator
        {...(captureTarget ? { captureTarget } : {})}
        isAuthenticated={forcedAuthState}
      />
    );
  }

  if (initializing) {
    const deepLinkStatus =
      pendingInviteTarget && !session
        ? 'Invite link detected. Preparing secure handoff.'
        : 'Verifying secure session.';

    return (
      <View style={styles.loadingContainer}>
        <AppEntryMoment
          status={deepLinkStatus}
          subtitle="Invocation gate active. Entering your sanctuary."
          title="Entering your circle"
        />
      </View>
    );
  }

  return (
    <RootNavigator
      {...(runtimeCaptureTarget ? { captureTarget: runtimeCaptureTarget } : {})}
      isAuthenticated={Boolean(session)}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: colors.bgHomeStart,
    flex: 1,
    justifyContent: 'flex-start',
  },
});
