import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { User } from '@supabase/supabase-js';

import { Button } from '../components/Button';
import { MetricRow } from '../components/MetricRow';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchProfileSummary, setHighContrastMode, type ProfileSummary } from '../lib/api/data';
import { supabase } from '../lib/supabase';
import {
  PROFILE_IMPACT_HEIGHT,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
} from '../theme/figmaV2Layout';
import { colors } from '../theme/tokens';

function formatImpact(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }
  return `${value}%`;
}

export function ProfileScreen() {
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setSummary(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const nextSummary = await fetchProfileSummary(nextUser.id);
      setSummary(nextSummary);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

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
      await loadProfile(data.user);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadProfile(nextUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

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

  const onToggleHighContrast = async () => {
    if (!user || !summary) {
      return;
    }

    setSavingPreference(true);
    try {
      await setHighContrastMode(user.id, !summary.highContrastMode);
      await loadProfile(user);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update preferences.');
    } finally {
      setSavingPreference(false);
    }
  };

  const statRows = useMemo(
    () => [
      { label: 'Circle members', value: (summary?.circleMembers ?? 0).toString() },
      {
        label: 'Event rooms joined this week',
        value: (summary?.eventsJoinedThisWeek ?? 0).toString(),
      },
      { label: 'Solo completion streak', value: `${summary?.soloStreakDays ?? 0} days` },
      { label: 'High contrast mode', value: summary?.highContrastMode ? 'On' : 'Off' },
    ],
    [summary],
  );

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
        Track your activity, accessibility settings, and account status.
      </Typography>

      <SurfaceCard radius="xl" style={[styles.section, styles.impactCard]} variant="profileImpact">
        {loadingProfile ? (
          <ActivityIndicator color={colors.accentMintStart} />
        ) : (
          <>
            <Typography allowFontScaling={false} variant="Metric" weight="bold">
              {formatImpact(summary?.weeklyImpactChangePercent ?? 0)}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
              Weekly collective impact change
            </Typography>
            <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption">
              {`Minutes prayed: ${summary?.minutesPrayed ?? 0} • Sessions this week: ${summary?.sessionsThisWeek ?? 0}`}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption">
              {`Account: ${user?.email ?? 'Unavailable'}`}
            </Typography>
            <Button
              loading={savingPreference}
              onPress={() => void onToggleHighContrast()}
              title={summary?.highContrastMode ? 'Disable high contrast' : 'Enable high contrast'}
              variant="sky"
            />
          </>
        )}
      </SurfaceCard>

      <View style={styles.statsList}>
        {statRows.map((item) => (
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
