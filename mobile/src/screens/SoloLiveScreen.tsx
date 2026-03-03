import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchPrayerScriptVariantByTitle, fetchUserPreferences } from '../lib/api/data';
import { generatePrayerAudio } from '../lib/api/functions';
import { configureAudioForPlayback, createPlayer, type ManagedAudioPlayer } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type SoloLiveRoute = RouteProp<SoloStackParamList, 'SoloLive'>;
type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloLive'>;

const VOICE_OPTIONS = ['Oliver', 'Amaya', 'Rainbird', 'Dominic'] as const;
const MINUTE_OPTIONS = [3, 5, 10] as const;
const DEFAULT_ELEVENLABS_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';
const ELEVENLABS_VOICE_ID_BY_LABEL: Partial<
  Record<(typeof VOICE_OPTIONS)[number], string>
> = {
  Oliver: 'jfIS2w2yJi0grJZPyEsk',
  Amaya: 'BFvr34n3gOoz0BAf9Rwn',
  Rainbird: 'bgU7lBMo69PNEOWHFqxM',
  Dominic: 'V904i8ujLitGpMyoTznT',
};

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(1, '0');
  const seconds = (clamped % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function sanitizeScriptParagraph(paragraph: string) {
  const withoutMarkdownHeadings = paragraph
    .replace(/^\*\*\s*(grounding|prayer|closing)\s*\*\*\s*[:\-–—]?\s*/i, '')
    .replace(/^(grounding|prayer|closing)\s*[:\-–—]\s*/i, '')
    .replace(/\*\*/g, '');

  return withoutMarkdownHeadings.trim();
}

function splitLongParagraph(paragraph: string, maxChars = 130) {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 1) {
    return [paragraph];
  }

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      chunks.push(sentence.trim());
    }
  }

  if (buffer) {
    chunks.push(buffer.trim());
  }

  return chunks.length > 0 ? chunks : [paragraph];
}

function splitScriptIntoParagraphs(script: string) {
  const normalized = script.trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => sanitizeScriptParagraph(part))
    .filter((part) => part.length > 0);

  if (paragraphs.length > 1) {
    return paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  const singleParagraph = paragraphs[0] ?? '';
  if (!singleParagraph) {
    return [];
  }

  const sentences = singleParagraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 2) {
    return [singleParagraph];
  }

  const fallbackParagraphs: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= 240) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      fallbackParagraphs.push(buffer.trim());
      buffer = sentence;
    } else {
      fallbackParagraphs.push(sentence.trim());
    }
  }

  if (buffer) {
    fallbackParagraphs.push(buffer.trim());
  }

  if (fallbackParagraphs.length > 0) {
    return fallbackParagraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  return splitLongParagraph(singleParagraph);
}

export function SoloLiveScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const route = useRoute<SoloLiveRoute>();

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Oliver');
  const [selectedMinutes, setSelectedMinutes] = useState<(typeof MINUTE_OPTIONS)[number]>(10);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isMinuteMenuOpen, setIsMinuteMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [scriptText, setScriptText] = useState(route.params?.scriptPreset ?? '');
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playPulseRef = useRef<LottieView>(null);
  const activePlayerRef = useRef<ManagedAudioPlayer | null>(null);
  const activePlayerKeyRef = useRef<string | null>(null);
  const activePlayerUnsubscribeRef = useRef<(() => void) | null>(null);

  const activePrayerTitle = route.params?.intention?.trim() || 'Prayer';
  const fallbackScript = route.params?.scriptPreset || '';
  const resolvedScriptText = scriptText || fallbackScript;
  const totalSeconds = selectedMinutes * 60;

  const progress = useMemo(() => {
    if (totalSeconds <= 0) {
      return 0;
    }

    return Math.min(1, elapsedSeconds / totalSeconds);
  }, [elapsedSeconds, totalSeconds]);

  const elapsedLabel = useMemo(() => formatClock(elapsedSeconds), [elapsedSeconds]);
  const totalLabel = useMemo(() => formatClock(totalSeconds), [totalSeconds]);
  const scriptParagraphs = useMemo(
    () => splitScriptIntoParagraphs(resolvedScriptText),
    [resolvedScriptText],
  );
  const activeParagraphIndex = useMemo(() => {
    if (scriptParagraphs.length <= 1 || totalSeconds <= 0) {
      return 0;
    }

    const normalizedProgress = Math.min(0.999999, Math.max(0, elapsedSeconds / totalSeconds));
    return Math.min(
      scriptParagraphs.length - 1,
      Math.floor(normalizedProgress * scriptParagraphs.length),
    );
  }, [elapsedSeconds, scriptParagraphs.length, totalSeconds]);
  const activeParagraph = scriptParagraphs[activeParagraphIndex] ?? '';
  const activeVoiceId =
    ELEVENLABS_VOICE_ID_BY_LABEL[selectedVoice] ?? DEFAULT_ELEVENLABS_VOICE_ID;
  const activeAudioKey = useMemo(
    () => `${activeVoiceId}|${selectedMinutes}|${resolvedScriptText.trim()}`,
    [activeVoiceId, resolvedScriptText, selectedMinutes],
  );

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsMinuteMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  const disposeActivePlayer = useCallback(() => {
    activePlayerRef.current?.pause();
    activePlayerUnsubscribeRef.current?.();
    activePlayerUnsubscribeRef.current = null;
    activePlayerRef.current?.dispose();
    activePlayerRef.current = null;
    activePlayerKeyRef.current = null;
  }, []);

  const stopActivePlayback = useCallback(async () => {
    const activePlayer = activePlayerRef.current;
    if (!activePlayer) {
      return;
    }

    try {
      await activePlayer.stop();
    } catch {
      activePlayer.pause();
    }

    setIsRunning(false);
    setElapsedSeconds(0);
  }, []);

  const onExitSession = useCallback(() => {
    closeAllSelectors();

    void (async () => {
      await stopActivePlayback();
      disposeActivePlayer();
      navigation.goBack();
    })();
  }, [closeAllSelectors, disposeActivePlayer, navigation, stopActivePlayback]);

  const ensureAudioPlayer = useCallback(async () => {
    const nextScript = resolvedScriptText.trim();
    if (!nextScript) {
      throw new Error('No script available for this prayer yet.');
    }

    if (activePlayerRef.current && activePlayerKeyRef.current === activeAudioKey) {
      return activePlayerRef.current;
    }

    setLoadingAudio(true);
    try {
      await configureAudioForPlayback();

      const audioResponse = await generatePrayerAudio({
        script: nextScript,
        voiceId: activeVoiceId,
      });

      const audioUrl = audioResponse?.audioUrl?.trim();
      const audioBase64 = audioResponse?.audioBase64?.trim();
      const contentType = audioResponse?.contentType?.trim() || 'audio/mpeg';

      if (!audioUrl && !audioBase64) {
        throw new Error('Audio generation returned an empty payload.');
      }

      const sourceUri = audioUrl || `data:${contentType};base64,${audioBase64}`;

      disposeActivePlayer();

      const player = createPlayer(sourceUri);
      activePlayerUnsubscribeRef.current = player.subscribe((status) => {
        setElapsedSeconds(Math.max(0, Math.floor(status.positionMillis / 1000)));
        if (status.didJustFinish) {
          setIsRunning(false);
        }
      });

      activePlayerRef.current = player;
      activePlayerKeyRef.current = activeAudioKey;

      return player;
    } finally {
      setLoadingAudio(false);
    }
  }, [activeAudioKey, activeVoiceId, disposeActivePlayer, resolvedScriptText]);

  const loadSelectedScript = useCallback(async () => {
    if (!activePrayerTitle) {
      return;
    }

    setLoadingScript(true);
    try {
      const script = await fetchPrayerScriptVariantByTitle({
        durationMinutes: selectedMinutes,
        title: activePrayerTitle,
      });

      if (script) {
        setScriptText(script);
      } else {
        setScriptText(route.params?.scriptPreset ?? '');
      }
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load prayer script.');
    } finally {
      setLoadingScript(false);
    }
  }, [activePrayerTitle, route.params?.scriptPreset, selectedMinutes]);

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          return;
        }

        const preferences = await fetchUserPreferences(data.user.id);
        if (!active) {
          return;
        }

        const preferredMinutes = preferences.preferredSessionMinutes;
        if (MINUTE_OPTIONS.includes(preferredMinutes as (typeof MINUTE_OPTIONS)[number])) {
          setSelectedMinutes(preferredMinutes as (typeof MINUTE_OPTIONS)[number]);
        }

        if (preferences.preferredVoiceId?.trim()) {
          const normalizedPreferredVoice = preferences.preferredVoiceId.trim().toLowerCase();
          const matched = VOICE_OPTIONS.find(
            (voice) =>
              voice.toLowerCase() === normalizedPreferredVoice ||
              ELEVENLABS_VOICE_ID_BY_LABEL[voice]?.toLowerCase() === normalizedPreferredVoice,
          );
          if (matched) {
            setSelectedVoice(matched);
          }
        }
      } catch {
        // Non-blocking for UI.
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadSelectedScript();
  }, [loadSelectedScript]);

  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    disposeActivePlayer();
  }, [activeAudioKey, disposeActivePlayer]);

  useEffect(() => {
    return () => {
      void stopActivePlayback();
      disposeActivePlayer();
    };
  }, [disposeActivePlayer, stopActivePlayback]);

  useEffect(() => {
    if (elapsedSeconds < totalSeconds) {
      return;
    }

    setIsRunning(false);
    if (activePlayerRef.current) {
      void activePlayerRef.current.stop();
    }
  }, [elapsedSeconds, totalSeconds]);

  useEffect(() => {
    if (!playPulseRef.current) {
      return;
    }

    if (isRunning) {
      playPulseRef.current.play();
      return;
    }

    playPulseRef.current.reset();
  }, [isRunning]);

  const onTogglePlayback = useCallback(async () => {
    closeAllSelectors();

    if (isRunning) {
      activePlayerRef.current?.pause();
      setIsRunning(false);
      return;
    }

    try {
      const player = await ensureAudioPlayer();
      player.play();
      setIsRunning(true);
      setError(null);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to generate prayer audio.';
      setError(message);
      setIsRunning(false);
    }
  }, [closeAllSelectors, ensureAudioPlayer, isRunning]);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.screenContent}
      scrollable={false}
      variant="solo"
      withTabBarInset={false}
    >
      <Pressable onPress={closeAllSelectors} style={styles.container}>
        <View style={styles.topActionsRow}>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => setIsFavorite((current) => !current)}
            style={({ pressed }) => [styles.iconCircleButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Close solo session"
            onPress={onExitSession}
            style={({ pressed }) => [styles.iconCircleButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        <View style={styles.headerBlock}>
          <Typography
            allowFontScaling={false}
            style={styles.prayerTitle}
            variant="H1"
            weight="bold"
          >
            {activePrayerTitle}
          </Typography>
        </View>

        <View style={styles.selectorRow}>
          <View style={styles.selectorContainer}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsMinuteMenuOpen(false);
                setIsVoiceMenuOpen((current) => !current);
              }}
              style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorPressed]}
            >
              <View style={styles.voiceAvatar}>
                <MaterialCommunityIcons color={colors.textPrimary} name="account" size={13} />
              </View>
              <Typography
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.75}
                numberOfLines={1}
                style={styles.selectorValue}
                variant="Body"
                weight="bold"
              >
                {selectedVoice}
              </Typography>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name={isVoiceMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
              />
            </Pressable>

            {isVoiceMenuOpen ? (
              <SurfaceCard radius="md" style={styles.dropdownMenu}>
                {VOICE_OPTIONS.map((voice) => (
                  <Pressable
                    key={voice}
                    onPress={(event) => {
                      event.stopPropagation();
                      setSelectedVoice(voice);
                      setIsVoiceMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      selectedVoice === voice && styles.dropdownOptionActive,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <Typography
                      allowFontScaling={false}
                      color={selectedVoice === voice ? colors.textOnSky : colors.textPrimary}
                      variant="Body"
                      weight="bold"
                    >
                      {voice}
                    </Typography>
                  </Pressable>
                ))}
              </SurfaceCard>
            ) : null}
          </View>

          <View style={styles.selectorContainer}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsVoiceMenuOpen(false);
                setIsMinuteMenuOpen((current) => !current);
              }}
              style={({ pressed }) => [
                styles.selectorButton,
                styles.minutesSelectorButton,
                pressed && styles.selectorPressed,
              ]}
            >
              <Typography
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.75}
                numberOfLines={1}
                style={styles.selectorValue}
                variant="Body"
                weight="bold"
              >
                {`${selectedMinutes} min`}
              </Typography>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name={isMinuteMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
              />
            </Pressable>

            {isMinuteMenuOpen ? (
              <SurfaceCard radius="md" style={styles.dropdownMenu}>
                {MINUTE_OPTIONS.map((minutes) => (
                  <Pressable
                    key={minutes}
                    onPress={(event) => {
                      event.stopPropagation();
                      setSelectedMinutes(minutes);
                      setIsMinuteMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      selectedMinutes === minutes && styles.dropdownOptionActive,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <Typography
                      allowFontScaling={false}
                      color={selectedMinutes === minutes ? colors.textOnSky : colors.textPrimary}
                      variant="Body"
                      weight="bold"
                    >
                      {`${minutes} min`}
                    </Typography>
                  </Pressable>
                ))}
              </SurfaceCard>
            ) : null}
          </View>
        </View>

        <View style={styles.centerBlock}>
          <Pressable
            disabled={loadingScript || loadingAudio || !resolvedScriptText.trim()}
            onPress={() => {
              void onTogglePlayback();
            }}
            style={({ pressed }) => [styles.playPulseTap, pressed && styles.playPressed]}
          >
            <View style={styles.playPulseContainer}>
              <LottieView
                autoPlay={false}
                loop
                ref={playPulseRef}
                source={globeFallbackAnimation}
                style={styles.playPulseLottie}
              />
              <View style={styles.playButtonCore}>
                <MaterialCommunityIcons
                  color={figmaV2Reference.tabs.activeBorder}
                  name={isRunning ? 'pause' : 'play'}
                  size={42}
                />
              </View>
            </View>
          </Pressable>
          <Typography
            allowFontScaling={false}
            color={colors.textSecondary}
            style={styles.readyLabel}
            variant="H2"
            weight="bold"
          >
            {loadingAudio ? 'Preparing audio...' : isRunning ? 'Playing' : 'Ready to begin'}
          </Typography>

          <View style={styles.scriptWrap}>
            {loadingScript ? (
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
                Loading prayer script...
              </Typography>
            ) : resolvedScriptText ? (
              <View style={styles.scriptSyncWrap}>
                <Typography
                  adjustsFontSizeToFit
                  allowFontScaling={false}
                  minimumFontScale={0.58}
                  numberOfLines={6}
                  style={styles.scriptTextActive}
                  variant="H2"
                  weight="bold"
                >
                  {activeParagraph}
                </Typography>
              </View>
            ) : (
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
                No script available for this prayer yet.
              </Typography>
            )}
          </View>

          {error ? (
            <Typography allowFontScaling={false} color={colors.danger} variant="Caption">
              {error}
            </Typography>
          ) : null}
        </View>

        <View style={styles.bottomBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {elapsedLabel}
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {totalLabel}
            </Typography>
          </View>

          {isInviteOpen ? (
            <SurfaceCard radius="md" style={styles.inviteMenu}>
              {['Invite your circle', 'Copy invite link', 'Share externally'].map((option) => (
                <Pressable
                  key={option}
                  onPress={(event) => {
                    event.stopPropagation();
                    setIsInviteOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.inviteOption,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <Typography allowFontScaling={false} variant="Body" weight="bold">
                    {option}
                  </Typography>
                </Pressable>
              ))}
            </SurfaceCard>
          ) : null}

          <View style={styles.bottomActionsRow}>
            <Pressable
              onPress={() => setIsMuted((current) => !current)}
              style={({ pressed }) => [styles.bottomIconAction, pressed && styles.selectorPressed]}
            >
              <MaterialCommunityIcons
                color={colors.textPrimary}
                name={isMuted ? 'volume-off' : 'volume-high'}
                size={30}
              />
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                variant="Body"
                weight="bold"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </Typography>
            </Pressable>

            <Pressable
              onPress={() => {
                setElapsedSeconds(0);
                setIsRunning(false);
                if (activePlayerRef.current) {
                  void activePlayerRef.current.stop();
                }
              }}
              style={({ pressed }) => [styles.bottomIconAction, pressed && styles.selectorPressed]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="restore" size={30} />
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                variant="Body"
                weight="bold"
              >
                Reset
              </Typography>
            </Pressable>

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsInviteOpen((current) => !current);
              }}
              style={({ pressed }) => [styles.inviteButton, pressed && styles.selectorPressed]}
            >
              <View style={styles.inviteIconCircle}>
                <MaterialCommunityIcons color={colors.textPrimary} name="account-group" size={16} />
              </View>
              <Typography
                allowFontScaling={false}
                style={styles.inviteText}
                variant="H2"
                weight="bold"
              >
                Invite
              </Typography>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name={isInviteOpen ? 'chevron-down' : 'chevron-up'}
                size={20}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  bottomBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bottomIconAction: {
    alignItems: 'center',
    borderRadius: radii.md,
    gap: spacing.xxs,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  container: {
    flex: 1,
    gap: sectionGap,
  },
  dropdownMenu: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xxs / 2,
  },
  dropdownOption: {
    borderRadius: radii.sm,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  dropdownOptionActive: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
    borderWidth: 1,
  },
  dropdownOptionPressed: {
    transform: [{ scale: 0.99 }],
  },
  headerBlock: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconCircleButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  inviteIconCircle: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  inviteMenu: {
    gap: spacing.xxs,
  },
  inviteOption: {
    borderRadius: radii.sm,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  inviteText: {
    textTransform: 'none',
  },
  minutesSelectorButton: {
    justifyContent: 'center',
  },
  playButtonCore: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 0,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  playPulseContainer: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    height: 140,
    width: 140,
  },
  playPulseLottie: {
    height: 156,
    position: 'absolute',
    width: 156,
  },
  playPulseTap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: {
    transform: [{ scale: 0.98 }],
  },
  prayerTitle: {
    textAlign: 'center',
  },
  progressFill: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 16,
    overflow: 'hidden',
  },
  readyLabel: {
    textAlign: 'center',
    textTransform: 'none',
  },
  screenContent: {
    flex: 1,
  },
  scriptSyncWrap: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'center',
    minHeight: 0,
    paddingBottom: spacing.xxs,
    width: '100%',
  },
  scriptTextActive: {
    fontSize: 21,
    lineHeight: 31,
    maxWidth: '98%',
    paddingBottom: spacing.xxs,
    textAlign: 'center',
  },
  scriptWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorPressed: {
    transform: [{ scale: 0.98 }],
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectorValue: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 18,
    textTransform: 'none',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voiceAvatar: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
});
