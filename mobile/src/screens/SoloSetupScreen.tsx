import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { PremiumPrayerCardSurface } from '../components/CinematicPrimitives';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Typography } from '../components/Typography';
import { SetupSummaryPanel } from '../features/setup/components/SetupSummaryPanel';
import { SoloSetupHero } from '../features/setup/components/SoloSetupHero';
import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import {
  fetchSoloStats,
  fetchUserPreferences,
  getCachedSoloStats,
  getCachedUserPreferences,
  type UserPreferences,
} from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';
import { motion, radii, sectionVisualThemes, soloSurface, spacing } from '../theme/tokens';

type SoloSetupNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloSetup'>;
type SoloSetupRoute = RouteProp<SoloStackParamList, 'SoloSetup'>;

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
  const reduceMotionEnabled = useReducedMotion();
  const actionSettle = useMemo(() => new Animated.Value(0), []);

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intention = route.params?.intention?.trim() || 'Set your intention on the previous screen';

  useEffect(() => {
    if (reduceMotionEnabled) {
      actionSettle.setValue(1);
      return;
    }

    actionSettle.setValue(0);
    const animation = Animated.timing(actionSettle, {
      duration: motion.durationMs.slow,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [actionSettle, reduceMotionEnabled]);

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

  const summaryItems = useMemo(
    () => [
      {
        label: 'Duration',
        value: `${preferences.preferredSessionMinutes} min`,
      },
      {
        label: 'Breath mode',
        value: preferences.preferredBreathMode,
      },
      {
        label: 'Ambient',
        value: preferences.preferredAmbient,
      },
      {
        label: 'Voice',
        value: preferences.voiceEnabled ? 'Enabled' : 'Muted',
      },
    ],
    [preferences],
  );

  const actionSettleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: actionSettle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
        transform: [
          {
            translateY: actionSettle.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      };

  const onStartSession = () => {
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
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <SoloSetupHero intention={intention} loading={loading} sessionsToday={sessionsToday} />

      <SetupSummaryPanel errorMessage={error} items={summaryItems} loading={loading} />

      <Animated.View style={actionSettleStyle}>
        <PremiumPrayerCardSurface
          accessibilityHint="Contains the primary action to start your solo session."
          accessibilityLabel="Session actions"
          fallbackIcon="play-circle-outline"
          fallbackLabel="Begin now"
          section="solo"
          style={styles.actionPanel}
        >
          <SectionHeader
            compact
            subtitle={
              loading
                ? 'Syncing your latest preferences...'
                : 'You can begin now. Your selected settings are already loaded for this session.'
            }
            subtitleColor={sectionVisualThemes.solo.nav.labelIdle}
            title="Begin your sanctuary session"
            titleColor={soloSurface.card.title}
          />

          <View style={styles.progressChip}>
            <Typography color={soloSurface.card.ctaText} variant="Caption" weight="bold">
              {`${sessionsToday} session${sessionsToday === 1 ? '' : 's'} completed today`}
            </Typography>
          </View>

          <Button onPress={onStartSession} title="Start solo session" variant="gold" />
        </PremiumPrayerCardSurface>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionPanel: {
    gap: spacing.sm,
  },
  content: {
    gap: sectionGap,
  },
  noMotion: {
    opacity: 1,
  },
  progressChip: {
    alignSelf: 'flex-start',
    backgroundColor: soloSurface.card.ctaBackground,
    borderColor: soloSurface.card.ctaBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});