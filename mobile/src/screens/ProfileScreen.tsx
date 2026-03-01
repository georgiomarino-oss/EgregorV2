import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { User } from '@supabase/supabase-js';

import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../theme/tokens';

const placeholderStats = [
  { label: 'Circle members', value: '29' },
  { label: 'Event rooms joined this week', value: '16' },
  { label: 'Solo completion streak', value: '5 days' },
  { label: 'High contrast mode', value: 'On' },
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
    <CosmicBackground ambientSource={ambientAnimation} variant="profile">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Trust and progress
        </Typography>
        <Typography color={colors.textSecondary}>
          Profile doubles as retention center: progress, connection, and easy controls.
        </Typography>

        <SurfaceCard radius="xl" style={styles.section} variant="profileImpact">
          <Typography variant="Metric" weight="bold">
            +38%
          </Typography>
          <Typography color={colors.textSecondary} variant="Label">
            Weekly collective impact change
          </Typography>
          <Button onPress={() => null} title="Edit ritual and accessibility" variant="sky" />
          <Typography color={colors.textSecondary} variant="Caption">
            {`Account: ${user?.email ?? 'Loading...'}`}
          </Typography>
        </SurfaceCard>

        <View style={styles.statsList}>
          {placeholderStats.map((item) => (
            <SurfaceCard key={item.label} radius="sm" style={styles.statRow} variant="profileRow">
              <Typography variant="Body">{item.label}</Typography>
              <Typography variant="Body" weight="bold">
                {item.value}
              </Typography>
            </SurfaceCard>
          ))}
        </View>

        {error ? <Typography color={colors.danger}>{error}</Typography> : null}

        <Button loading={loadingSignOut} onPress={onSignOut} title="Sign out" variant="secondary" />
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  section: {
    gap: spacing.sm,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  statsList: {
    gap: spacing.xs,
  },
});
