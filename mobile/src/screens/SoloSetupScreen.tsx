import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchSoloStats,
  fetchUserPreferences,
  getCachedSoloStats,
  getCachedUserPreferences,
  type UserPreferences,
} from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { profileRowGap, sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

type SoloSetupNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloSetup'>;
type SoloSetupRoute = RouteProp<SoloStackParamList, 'SoloSetup'>;

function SetupStat({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard radius="md" style={styles.setupStat}>
      <Typography color={colors.textSecondary} variant="Label">
        {label}
      </Typography>
      <Typography variant="H2" weight="bold">
        {value}
      </Typography>
    </SurfaceCard>
  );
}

const defaultPreferences: UserPreferences = {
  highContrastMode: false,
  preferredAmbient: 'Bowls',
  preferredBreathMode: 'Deep',
  preferredSessionMinutes: 5,
  preferredVoiceId: '',
  voiceEnabled: true,
};

export function SoloSetupScreen() {
  const navigation = useNavigation<SoloSetupNavigation>();
  const route = useRoute<SoloSetupRoute>();

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intention = route.params?.intention?.trim() || 'Set your intention on the previous screen';

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          throw new Error(userError?.message || 'Could not load user context.');
        }

        const cachedPreferences = getCachedUserPreferences(data.user.id);
        const cachedStats = getCachedSoloStats(data.user.id);
        if (cachedPreferences) {
          setPreferences(cachedPreferences);
        }
        if (cachedStats) {
          setSessionsToday(cachedStats.sessionsToday);
        }
        if (cachedPreferences || cachedStats) {
          setLoading(false);
        } else {
          setLoading(true);
        }

        const [nextPreferences, soloStats] = await Promise.all([
          fetchUserPreferences(data.user.id),
          fetchSoloStats(data.user.id),
        ]);

        if (!active) {
          return;
        }

        setPreferences(nextPreferences);
        setSessionsToday(soloStats.sessionsToday);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load setup data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <Typography variant="H1" weight="bold">
        Intentional solo ritual
      </Typography>
      <Typography color={colors.textSecondary}>
        Confirm your settings, then begin your guided session.
      </Typography>

      <SurfaceCard radius="xl" style={styles.section}>
        <Typography color={colors.textSecondary} variant="Label">
          Intention
        </Typography>
        <Typography variant="H2">{intention}</Typography>

        {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}

        <View style={styles.row}>
          <SetupStat label="Duration" value={`${preferences.preferredSessionMinutes} min`} />
          <SetupStat label="Breath mode" value={preferences.preferredBreathMode} />
        </View>

        <View style={styles.row}>
          <SetupStat label="Ambient" value={preferences.preferredAmbient} />
          <SetupStat label="Voice" value={preferences.voiceEnabled ? 'Enabled' : 'Muted'} />
        </View>

        {error ? (
          <Typography color={colors.danger} variant="Caption">
            {error}
          </Typography>
        ) : null}

        <Button
          onPress={() => {
            const nextParams: NonNullable<SoloStackParamList['SoloLive']> = { intention };

            if (route.params?.scriptPreset) {
              nextParams.scriptPreset = route.params.scriptPreset;
            }
            if (route.params?.prayerLibraryItemId) {
              nextParams.prayerLibraryItemId = route.params.prayerLibraryItemId;
            }
            if (route.params?.durationMinutes) {
              nextParams.durationMinutes = route.params.durationMinutes;
            }
            if (route.params?.allowAudioGeneration === true) {
              nextParams.allowAudioGeneration = true;
            }

            navigation.navigate('SoloLive', nextParams);
          }}
          title="Start solo session"
          variant="gold"
        />
      </SurfaceCard>

      <SurfaceCard radius="sm" style={styles.section}>
        <Typography variant="H2" weight="bold">
          Today&apos;s progress
        </Typography>
        <Typography color={colors.textSecondary}>
          {`${sessionsToday} completed session${sessionsToday === 1 ? '' : 's'} today.`}
        </Typography>
      </SurfaceCard>
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
  setupStat: {
    flex: 1,
    gap: profileRowGap,
  },
});
