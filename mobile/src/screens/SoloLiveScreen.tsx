import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { generatePrayerAudio, generatePrayerScript } from '../lib/api/functions';
import {
  fetchSoloStats,
  fetchUserPreferences,
  recordSoloSession,
  type SoloStats,
} from '../lib/api/data';
import { configureAudioForPlayback, createPlayer, type ManagedAudioPlayer } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { profileRowGap, sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type SoloLiveRoute = RouteProp<SoloStackParamList, 'SoloLive'>;

function formatMillis(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const defaultSoloStats: SoloStats = {
  minutesThisWeek: 0,
  sessionsThisWeek: 0,
  sessionsToday: 0,
};

export function SoloLiveScreen() {
  const route = useRoute<SoloLiveRoute>();
  const playerRef = useRef<ManagedAudioPlayer | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastRecordedMillisRef = useRef(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [script, setScript] = useState(route.params?.scriptPreset ?? '');
  const [audioStatus, setAudioStatus] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundReady, setIsSoundReady] = useState(false);
  const [breathMode, setBreathMode] = useState('Deep');
  const [soloStats, setSoloStats] = useState<SoloStats>(defaultSoloStats);

  const intention = route.params?.intention || 'Intention not set';

  const disposePlayer = () => {
    statusUnsubscribeRef.current?.();
    statusUnsubscribeRef.current = null;
    playerRef.current?.dispose();
    playerRef.current = null;
    setDurationMillis(0);
    setPositionMillis(0);
    setIsPlaying(false);
    setIsSoundReady(false);
  };

  const bindPlayer = (nextPlayer: ManagedAudioPlayer) => {
    statusUnsubscribeRef.current?.();
    playerRef.current = nextPlayer;
    statusUnsubscribeRef.current = nextPlayer.subscribe((status) => {
      setDurationMillis(status.durationMillis);
      setPositionMillis(status.positionMillis);
      setIsPlaying(status.playing);
      setIsSoundReady(status.isLoaded);
    });
  };

  useEffect(() => {
    return () => {
      disposePlayer();
    };
  }, []);

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

        setUserId(currentUserId);
        setBreathMode(preferences.preferredBreathMode);
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

  const loadAndPlaySound = async (uri: string) => {
    disposePlayer();
    lastRecordedMillisRef.current = 0;
    const nextPlayer = createPlayer(uri);
    bindPlayer(nextPlayer);
    nextPlayer.play();
  };

  const onGenerateScript = async () => {
    if (!intention.trim()) {
      setError('Add an intention first.');
      return;
    }

    setError(null);
    setAudioStatus('');
    setLoadingScript(true);

    try {
      const response = await generatePrayerScript({
        intention: intention.trim(),
        length: 'medium',
      });
      setScript(response?.script ?? 'No script returned.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to generate script.');
    } finally {
      setLoadingScript(false);
    }
  };

  const onGenerateAudio = async () => {
    if (!script.trim()) {
      setError('Generate a script before requesting audio.');
      return;
    }

    setError(null);
    setLoadingAudio(true);

    try {
      await configureAudioForPlayback();
      const response = await generatePrayerAudio({ script });

      const audioUri = response?.audioUrl
        ? response.audioUrl
        : response?.audioBase64
          ? `data:${response.contentType ?? 'audio/mpeg'};base64,${response.audioBase64}`
          : null;

      if (!audioUri) {
        setAudioStatus('Audio response was empty.');
        return;
      }

      await loadAndPlaySound(audioUri);
      setAudioStatus('Session audio generated and playing.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to generate audio.');
    } finally {
      setLoadingAudio(false);
    }
  };

  const onTogglePause = () => {
    const activePlayer = playerRef.current;
    if (!activePlayer) {
      return;
    }

    if (isPlaying) {
      activePlayer.pause();
      setIsPlaying(false);
    } else {
      activePlayer.play();
      setIsPlaying(true);
    }
  };

  const onStop = async () => {
    const activePlayer = playerRef.current;
    if (!activePlayer) {
      return;
    }

    const playedMillis = positionMillis;
    await activePlayer.stop();
    setPositionMillis(0);
    setIsPlaying(false);

    if (!userId || playedMillis <= 0 || playedMillis <= lastRecordedMillisRef.current) {
      return;
    }

    try {
      await recordSoloSession({
        durationSeconds: playedMillis / 1000,
        intention,
        scriptText: script,
        userId,
      });
      const refreshed = await fetchSoloStats(userId);
      setSoloStats(refreshed);
      lastRecordedMillisRef.current = playedMillis;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save session progress.');
    }
  };

  const elapsedLabel = useMemo(() => formatMillis(positionMillis), [positionMillis]);
  const durationLabel = useMemo(() => formatMillis(durationMillis), [durationMillis]);
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
        Generate your script, listen to guided audio, and track completed practice.
      </Typography>

      <SurfaceCard radius="xl" style={styles.section}>
        <Typography color={colors.textSecondary} variant="Label">
          {`Breath mode: ${loadingMeta ? 'Loading...' : breathMode}`}
        </Typography>

        <View style={styles.timerWrap}>
          <View style={styles.timerInner}>
            <Typography color={figmaV2Reference.buttons.gold.from} variant="Metric" weight="bold">
              {elapsedLabel}
            </Typography>
            <Typography color={colors.textSecondary} variant="Caption">
              {`of ${durationLabel}`}
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

        <View style={styles.buttonRow}>
          <Button
            loading={loadingScript}
            onPress={() => void onGenerateScript()}
            title="Generate Script"
            variant="gold"
          />
          <Button
            loading={loadingAudio}
            onPress={() => void onGenerateAudio()}
            title="Generate Audio"
            variant="primary"
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            disabled={!isSoundReady}
            onPress={onTogglePause}
            title={isPlaying ? 'Pause' : 'Resume'}
            variant="secondary"
          />
          <Button
            disabled={!isSoundReady}
            onPress={() => void onStop()}
            title="Stop"
            variant="secondary"
          />
        </View>

        {loadingMeta ? <ActivityIndicator color={colors.accentMintStart} /> : null}
        {script ? <Typography color={colors.textSecondary}>{script}</Typography> : null}
        {audioStatus ? <Typography variant="Caption">{audioStatus}</Typography> : null}
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
