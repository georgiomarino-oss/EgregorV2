import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Audio, type AVPlaybackStatus } from 'expo-av';

import { AppButton } from '../components/Buttons';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { generatePrayerAudio, generatePrayerScript } from '../lib/api/functions';
import { colors, radii, spacing, typography } from '../lib/theme/tokens';

function formatMillis(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function SoloScreen() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const [intention, setIntention] = useState('');
  const [script, setScript] = useState('');
  const [audioStatus, setAudioStatus] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundReady, setIsSoundReady] = useState(false);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const unloadCurrentSound = async () => {
    const activeSound = soundRef.current;
    if (!activeSound) {
      return;
    }

    await activeSound.unloadAsync();
    soundRef.current = null;
    setDurationMillis(0);
    setPositionMillis(0);
    setIsPlaying(false);
    setIsSoundReady(false);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setDurationMillis(status.durationMillis ?? 0);
    setPositionMillis(status.positionMillis);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(status.durationMillis ?? status.positionMillis);
    }
  };

  const loadAndPlaySound = async (uri: string) => {
    await unloadCurrentSound();

    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      {
        progressUpdateIntervalMillis: 300,
        shouldPlay: true,
      },
      onPlaybackStatusUpdate,
    );

    soundRef.current = sound;
    setIsSoundReady(true);

    if (status.isLoaded) {
      setDurationMillis(status.durationMillis ?? 0);
      setPositionMillis(status.positionMillis);
      setIsPlaying(status.isPlaying);
    }
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

  const onTogglePause = async () => {
    const activeSound = soundRef.current;
    if (!activeSound) {
      return;
    }

    if (isPlaying) {
      await activeSound.pauseAsync();
      setIsPlaying(false);
    } else {
      await activeSound.playAsync();
      setIsPlaying(true);
    }
  };

  const onStop = async () => {
    const activeSound = soundRef.current;
    if (!activeSound) {
      return;
    }

    await activeSound.stopAsync();
    await activeSound.setPositionAsync(0);
    setPositionMillis(0);
    setIsPlaying(false);
  };

  const elapsedLabel = useMemo(() => formatMillis(positionMillis), [positionMillis]);
  const durationLabel = useMemo(() => formatMillis(durationMillis), [durationMillis]);

  return (
    <CosmicBackground ambientSource={ambientAnimation}>
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="hero" weight="display">
          Solo Prayer Studio
        </Typography>
        <Typography color={colors.textSecondary}>
          Generate script + voice via Supabase Edge Functions, then run a guided solo ritual.
        </Typography>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Intention
          </Typography>
          <TextInput
            multiline
            onChangeText={setIntention}
            placeholder="Example: Peace and strength for my family this week"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={intention}
          />
          <AppButton
            loading={loadingScript}
            onPress={onGenerateScript}
            title="Generate Prayer Script"
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Script Output
          </Typography>
          {loadingScript ? (
            <View style={styles.centerRow}>
              <ActivityIndicator color={colors.auroraPrimary} />
            </View>
          ) : (
            <Typography color={script ? colors.textPrimary : colors.textSecondary}>
              {script || 'Your generated script appears here.'}
            </Typography>
          )}

          <AppButton
            loading={loadingAudio}
            onPress={onGenerateAudio}
            title="Generate Prayer Audio"
            variant="secondary"
          />

          {audioStatus ? <Typography variant="caption">{audioStatus}</Typography> : null}
          {error ? <Typography color={colors.danger}>{error}</Typography> : null}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Session Player
          </Typography>
          <Typography
            color={colors.textSecondary}
          >{`${elapsedLabel} / ${durationLabel}`}</Typography>
          <View style={styles.playerRow}>
            <AppButton
              disabled={!isSoundReady}
              onPress={() => {
                void onTogglePause();
              }}
              title={isPlaying ? 'Pause' : 'Resume'}
              variant="secondary"
            />
            <AppButton
              disabled={!isSoundReady}
              onPress={() => {
                void onStop();
              }}
              title="Stop"
            />
          </View>
        </SurfaceCard>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    alignItems: 'center',
    minHeight: 56,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  input: {
    backgroundColor: 'rgba(14, 22, 48, 0.86)',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.family.body,
    fontSize: typography.size.body,
    minHeight: 110,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  playerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
});
