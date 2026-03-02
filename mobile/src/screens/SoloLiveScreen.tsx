import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchSoloStats, fetchUserPreferences, type SoloStats } from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { profileRowGap, sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type SoloLiveRoute = RouteProp<SoloStackParamList, 'SoloLive'>;

const defaultSoloStats: SoloStats = {
  minutesThisWeek: 0,
  sessionsThisWeek: 0,
  sessionsToday: 0,
};

export function SoloLiveScreen() {
  const route = useRoute<SoloLiveRoute>();
  const [script] = useState(route.params?.scriptPreset ?? '');
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breathMode, setBreathMode] = useState('Deep');
  const [sessionMinutes, setSessionMinutes] = useState(5);
  const [soloStats, setSoloStats] = useState<SoloStats>(defaultSoloStats);

  useEffect(() => {
    let active = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          throw new Error(userError?.message || 'Could not load user session.');
        }

        const currentUserId = data.user.id;
        const [preferences, stats] = await Promise.all([
          fetchUserPreferences(currentUserId),
          fetchSoloStats(currentUserId),
        ]);

        if (!active) {
          return;
        }

        setBreathMode(preferences.preferredBreathMode);
        setSessionMinutes(preferences.preferredSessionMinutes);
        setSoloStats(stats);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(
          nextError instanceof Error ? nextError.message : 'Failed to load session context.',
        );
      } finally {
        if (active) {
          setLoadingMeta(false);
        }
      }
    };

    void loadMeta();

    return () => {
      active = false;
    };
  }, []);
  const scriptSteps = useMemo(
    () =>
      script
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 3),
    [script],
  );

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <Typography variant="H1" weight="bold">
        Live solo session
      </Typography>
      <Typography color={colors.textSecondary}>
        Follow your selected prayer script and track completed practice.
      </Typography>

      <SurfaceCard radius="xl" style={styles.section}>
        <Typography color={colors.textSecondary} variant="Label">
          {`Breath mode: ${loadingMeta ? 'Loading...' : breathMode}`}
        </Typography>

        <View style={styles.timerWrap}>
          <View style={styles.timerInner}>
            <Typography color={figmaV2Reference.buttons.gold.from} variant="Metric" weight="bold">
              Ready
            </Typography>
            <Typography color={colors.textSecondary} variant="Caption">
              {`${sessionMinutes} min session`}
            </Typography>
          </View>
        </View>

        {scriptSteps.length > 0 ? (
          scriptSteps.map((line, index) => (
            <SurfaceCard
              key={`${line}-${index}`}
              radius="sm"
              style={index === 0 ? styles.stepActive : styles.stepCard}
            >
              <Typography>{line}</Typography>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard radius="sm" style={styles.stepCard}>
            <Typography>Generate a script to show guided steps for this session.</Typography>
          </SurfaceCard>
        )}

        {loadingMeta ? <ActivityIndicator color={colors.accentMintStart} /> : null}
        {error ? <Typography color={colors.danger}>{error}</Typography> : null}
      </SurfaceCard>

      <View style={styles.row}>
        <SurfaceCard radius="md" style={styles.statCard}>
          <Typography color={colors.textSecondary} variant="Label">
            This week
          </Typography>
          <Typography variant="H2" weight="bold">
            {`${soloStats.sessionsThisWeek} sessions`}
          </Typography>
        </SurfaceCard>
        <SurfaceCard radius="md" style={styles.statCard}>
          <Typography color={colors.textSecondary} variant="Label">
            Minutes
          </Typography>
          <Typography variant="H2" weight="bold">
            {soloStats.minutesThisWeek.toString()}
          </Typography>
        </SurfaceCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  row: {
    flexDirection: 'row',
    gap: sectionGap,
  },
  section: {
    gap: sectionGap,
  },
  statCard: {
    flex: 1,
    gap: profileRowGap,
  },
  stepActive: {
    borderColor: figmaV2Reference.buttons.gold.border,
    paddingVertical: spacing.xs,
  },
  stepCard: {
    paddingVertical: spacing.xs,
  },
  timerInner: {
    alignItems: 'center',
    borderColor: figmaV2Reference.buttons.gold.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 210,
    justifyContent: 'center',
    width: 210,
  },
  timerWrap: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.eventRoom.miniButtonBackground,
    borderColor: figmaV2Reference.buttons.gold.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.sm,
  },
});
