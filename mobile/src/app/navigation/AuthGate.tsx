import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { Typography } from '../../components/Typography';
import { prefetchCoreAppData, updateAppUserPresence } from '../../lib/api/data';
import { prefetchEventAndPrayerAudioArtifacts } from '../../lib/artifactPrefetch';
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
  const forcedAuthState =
    captureTarget?.root === 'auth' ? false : captureTarget?.root === 'main' ? true : null;

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

  if (forcedAuthState !== null) {
    return (
      <RootNavigator
        {...(captureTarget ? { captureTarget } : {})}
        isAuthenticated={forcedAuthState}
      />
    );
  }

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentMintStart} size="large" />
        <Typography style={styles.loadingText}>Syncing your circle...</Typography>
      </View>
    );
  }

  return (
    <RootNavigator
      {...(captureTarget ? { captureTarget } : {})}
      isAuthenticated={Boolean(session)}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.bgHomeStart,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
  },
});
