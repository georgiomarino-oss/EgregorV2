import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { Typography } from '../../components/Typography';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/tokens';
import { RootNavigator } from './RootNavigator';

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
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
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentMintStart} size="large" />
        <Typography style={styles.loadingText}>Syncing your circle...</Typography>
      </View>
    );
  }

  return <RootNavigator isAuthenticated={Boolean(session)} />;
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
