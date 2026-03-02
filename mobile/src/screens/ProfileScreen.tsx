import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { User } from '@supabase/supabase-js';

import { Button } from '../components/Button';
import { MetricRow } from '../components/MetricRow';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { supabase } from '../lib/supabase';
import {
  PROFILE_IMPACT_HEIGHT,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
} from '../theme/figmaV2Layout';
import { colors } from '../theme/tokens';

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
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="profile"
    >
      <Typography allowFontScaling={false} variant="H1" weight="bold">
        Trust and progress
      </Typography>
      <Typography allowFontScaling={false} color={colors.textSecondary}>
        Profile doubles as retention center: progress, connection, and easy controls.
      </Typography>

      <SurfaceCard radius="xl" style={[styles.section, styles.impactCard]} variant="profileImpact">
        <Typography allowFontScaling={false} variant="Metric" weight="bold">
          +38%
        </Typography>
        <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
          Weekly collective impact change
        </Typography>
        <Button onPress={() => null} title="Edit ritual and accessibility" variant="sky" />
        <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption">
          {`Account: ${user?.email ?? 'Loading...'}`}
        </Typography>
      </SurfaceCard>

      <View style={styles.statsList}>
        {placeholderStats.map((item) => (
          <MetricRow key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      {error ? (
        <Typography allowFontScaling={false} color={colors.danger}>
          {error}
        </Typography>
      ) : null}

      <Button loading={loadingSignOut} onPress={onSignOut} title="Sign out" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  impactCard: {
    minHeight: PROFILE_IMPACT_HEIGHT,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
  },
  statsList: {
    gap: PROFILE_ROW_GAP,
  },
});
