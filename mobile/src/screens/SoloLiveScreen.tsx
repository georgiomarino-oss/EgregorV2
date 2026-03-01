import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { generatePrayerAudio, generatePrayerScript } from '../lib/api/functions';
import { configureAudioForPlayback, createPlayer, type ManagedAudioPlayer } from '../lib/audio';
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

export function SoloLiveScreen() {
  const route = useRoute<SoloLiveRoute>();
  const playerRef = useRef<ManagedAudioPlayer | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  const [script, setScript] = useState(route.params?.scriptPreset ?? '');
  const [audioStatus, setAudioStatus] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundReady, setIsSoundReady] = useState(false);

  const intention = route.params?.intention || 'peace, healing, and grounded courage';

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

  const loadAndPlaySound = async (uri: string) => {
    disposePlayer();
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

    await activePlayer.stop();
    setPositionMillis(0);
    setIsPlaying(false);
  };

  const elapsedLabel = useMemo(() => formatMillis(positionMillis), [positionMillis]);
  const durationLabel = useMemo(() => formatMillis(durationMillis), [durationMillis]);

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="solo">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Live ritual atmosphere
        </Typography>
        <Typography color={colors.textSecondary}>
          Dedicated solo screen with breathing-synced aura and divine light motion.
        </Typography>

        <SurfaceCard radius="xl" style={styles.section}>
          <Typography color={colors.textSecondary} variant="Label">
            Breath phase: exhale for 7s
          </Typography>

          <View style={styles.timerWrap}>
            <View style={styles.timerInner}>
              <Typography color="#FFE8BD" variant="Metric" weight="bold">
                {elapsedLabel}
              </Typography>
              <Typography color={colors.textSecondary} variant="Caption">
                {`of ${durationLabel}`}
              </Typography>
            </View>
          </View>

          <SurfaceCard radius="sm" style={styles.stepActive} tone="warm">
            <Typography>1. Breathe in and invite compassion.</Typography>
          </SurfaceCard>
          <SurfaceCard radius="sm" style={styles.stepCard}>
            <Typography>2. Breathe out and release fear.</Typography>
          </SurfaceCard>
          <SurfaceCard radius="sm" style={styles.stepCard}>
            <Typography>3. Rest in gratitude for healing already unfolding.</Typography>
          </SurfaceCard>

          <View style={styles.buttonRow}>
            <Button
              loading={loadingScript}
              onPress={onGenerateScript}
              title="Generate Script"
              variant="gold"
            />
            <Button
              loading={loadingAudio}
              onPress={onGenerateAudio}
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

          {loadingScript ? <ActivityIndicator color={colors.accentMintStart} /> : null}
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
              8 sessions
            </Typography>
          </SurfaceCard>
          <SurfaceCard radius="md" style={styles.statCard}>
            <Typography color={colors.textSecondary} variant="Label">
              Minutes
            </Typography>
            <Typography variant="H2" weight="bold">
              74
            </Typography>
          </SurfaceCard>
        </View>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  content: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
  },
  stepActive: {
    borderColor: 'rgba(255, 214, 152, 0.56)',
    paddingVertical: spacing.xs,
  },
  stepCard: {
    paddingVertical: spacing.xs,
  },
  timerInner: {
    alignItems: 'center',
    borderColor: 'rgba(255, 214, 152, 0.56)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 210,
    justifyContent: 'center',
    width: 210,
  },
  timerWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 32, 47, 0.84)',
    borderColor: 'rgba(255, 214, 152, 0.56)',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.sm,
  },
});
