import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { User } from '@supabase/supabase-js';

import { AppButton } from '../components/Buttons';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme/tokens';

const placeholderStats = [
  { label: 'Current streak', value: '3 days' },
  { label: 'Minutes prayed', value: '148 min' },
  { label: 'Events joined', value: '5' },
] as const;

export function ProfileScreen() {
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) {
        return;
      }

      if (userError) {
        setError(userError.message);
        return;
      }

      setUser(data.user);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const onSignOut = async () => {
    setError(null);
    setLoadingSignOut(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
      }
    } finally {
      setLoadingSignOut(false);
    }
  };

  return (
    <CosmicBackground ambientSource={ambientAnimation}>
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="hero" weight="display">
          Profile
        </Typography>
        <Typography color={colors.textSecondary}>
          MVP recommendation: progress metrics + preferences + privacy controls + sign out.
        </Typography>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Account
          </Typography>
          <Typography
            color={colors.textSecondary}
          >{`Email: ${user?.email ?? 'Loading...'}`}</Typography>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Progress Snapshot
          </Typography>
          {placeholderStats.map((item) => (
            <View key={item.label} style={styles.statRow}>
              <Typography color={colors.textSecondary}>{item.label}</Typography>
              <Typography weight="semibold">{item.value}</Typography>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Preferences (Placeholder)
          </Typography>
          <Typography color={colors.textSecondary}>Voice: Calm Guide</Typography>
          <Typography color={colors.textSecondary}>
            Accessibility: Larger captions + reduced motion
          </Typography>
          <Typography color={colors.textSecondary}>
            Privacy: Presence visible only during joined events
          </Typography>
          {error ? <Typography color={colors.danger}>{error}</Typography> : null}
          <AppButton
            loading={loadingSignOut}
            onPress={onSignOut}
            title="Sign Out"
            variant="secondary"
          />
        </SurfaceCard>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
