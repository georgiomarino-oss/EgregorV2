import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { SoloStackParamList } from '../app/navigation/types';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchPrayerScriptVariantByTitle,
  recordSoloSession,
  fetchUserPreferences,
  prefetchPrayerScriptVariantByTitle,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, motion, radii, roomAtmosphere, spacing } from '../theme/tokens';
import { RoomScriptPanel } from '../features/room-player/components/RoomScriptPanel';
import { RoomTransportControls } from '../features/room-player/components/RoomTransportControls';
import { useRoomAudioPlayer } from '../features/room-player/hooks/useRoomAudioPlayer';
import { SoloAuraField } from '../features/rooms/components/SoloAuraField';
import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import {
  buildPreviewParagraphsFromScript,
  resolveFallbackParagraphIndex,
  splitScriptIntoParagraphs,
} from '../features/room-player/utils/scriptLayout';
import {
  findActiveTimedParagraph,
  findActiveTimedWordIndex,
  groupTimedWordsIntoParagraphs,
} from '../features/room-player/utils/timedWords';

type SoloLiveRoute = RouteProp<SoloStackParamList, 'SoloLive'>;
type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloLive'>;

const VOICE_OPTIONS = ['Oliver', 'Amaya', 'Rainbird', 'Dominic'] as const;
const MINUTE_OPTIONS = [3, 5, 10] as const;
const DEFAULT_MINUTE_OPTION: (typeof MINUTE_OPTIONS)[number] = 10;
const DEFAULT_ELEVENLABS_VOICE_ID = 'V904i8ujLitGpMyoTznT';
const MAX_SCRIPT_LINES = 4;
const MIN_RECORDABLE_SESSION_SECONDS = 20;
const ELEVENLABS_VOICE_ID_BY_LABEL: Partial<Record<(typeof VOICE_OPTIONS)[number], string>> = {
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

function resolveMinuteOption(value: number | null | undefined) {
  if (MINUTE_OPTIONS.includes(value as (typeof MINUTE_OPTIONS)[number])) {
    return value as (typeof MINUTE_OPTIONS)[number];
  }

  return DEFAULT_MINUTE_OPTION;
}

export function SoloLiveScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const route = useRoute<SoloLiveRoute>();
  const routeDurationMinutes = route.params?.durationMinutes;
  const initialSelectedMinutes = resolveMinuteOption(routeDurationMinutes);
  const hasRouteDurationMinutes = routeDurationMinutes === initialSelectedMinutes;

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Dominic');
  const [selectedMinutes, setSelectedMinutes] =
    useState<(typeof MINUTE_OPTIONS)[number]>(initialSelectedMinutes);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isMinuteMenuOpen, setIsMinuteMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [scriptText, setScriptText] = useState(route.params?.scriptPreset ?? '');
  const [loadingScript, setLoadingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playPulseRef = useRef<LottieView>(null);
  const scriptTextRef = useRef(scriptText);
  const sessionUserIdRef = useRef<string | null>(null);
  const recordedSessionAudioKeyRef = useRef<string | null>(null);
  const reduceMotionEnabled = useReducedMotion();
  const headerIntro = useMemo(() => new Animated.Value(0), []);
  const stageIntro = useMemo(() => new Animated.Value(0), []);
  const transportIntro = useMemo(() => new Animated.Value(0), []);
  const scriptFocus = useMemo(() => new Animated.Value(0), []);

  const scriptLookupTitle = route.params?.intention?.trim() || '';
  const activePrayerTitle = scriptLookupTitle || 'Prayer';
  const fallbackScript = route.params?.scriptPreset || '';
  const allowAudioGeneration = route.params?.allowAudioGeneration === true;
  const prayerLibraryItemId = route.params?.prayerLibraryItemId?.trim() || '';
  const resolvedScriptText = scriptText || fallbackScript;
  const totalSeconds = selectedMinutes * 60;
  const totalMillis = totalSeconds * 1000;
  const activeVoiceId = ELEVENLABS_VOICE_ID_BY_LABEL[selectedVoice] ?? DEFAULT_ELEVENLABS_VOICE_ID;
  const activeAudioKey = useMemo(
    () => `${activeVoiceId}|${selectedMinutes}|${resolvedScriptText.trim()}`,
    [activeVoiceId, resolvedScriptText, selectedMinutes],
  );

  const {
    isMuted,
    isRunning,
    loadingAudio,
    pause,
    play,
    positionMillis: elapsedMillis,
    setMuted,
    stop,
    timedWords,
  } = useRoomAudioPlayer({
    activeAudioKey,
    allowAudioGeneration,
    durationMinutes: selectedMinutes,
    prayerLibraryItemId,
    scriptText: resolvedScriptText,
    title: activePrayerTitle,
    voiceId: activeVoiceId,
  });

  const progress = useMemo(() => {
    if (totalMillis <= 0) {
      return 0;
    }

    return Math.min(1, elapsedMillis / totalMillis);
  }, [elapsedMillis, totalMillis]);

  const elapsedLabel = useMemo(() => formatClock(elapsedMillis / 1000), [elapsedMillis]);
  const totalLabel = useMemo(() => formatClock(totalSeconds), [totalSeconds]);
  const activeTimedWordIndex = useMemo(
    () => findActiveTimedWordIndex(timedWords, elapsedMillis),
    [elapsedMillis, timedWords],
  );
  const timedWordParagraphs = useMemo(
    () => groupTimedWordsIntoParagraphs(timedWords),
    [timedWords],
  );
  const activeTimedParagraph = useMemo(
    () => findActiveTimedParagraph(timedWordParagraphs, activeTimedWordIndex),
    [activeTimedWordIndex, timedWordParagraphs],
  );
  const scriptParagraphs = useMemo(() => {
    const previewParagraphs = buildPreviewParagraphsFromScript(resolvedScriptText);
    if (previewParagraphs.length > 0) {
      return previewParagraphs;
    }

    return splitScriptIntoParagraphs(resolvedScriptText);
  }, [resolvedScriptText]);
  const fallbackParagraphIndex = useMemo(
    () =>
      resolveFallbackParagraphIndex({
        elapsedMillis,
        paragraphCount: scriptParagraphs.length,
        totalMillis,
      }),
    [elapsedMillis, scriptParagraphs.length, totalMillis],
  );
  const fallbackParagraph = scriptParagraphs[fallbackParagraphIndex] ?? '';

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsMinuteMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  const recordSessionIfNeeded = useCallback(async () => {
    if (recordedSessionAudioKeyRef.current === activeAudioKey) {
      return;
    }

    const durationSeconds = Math.max(0, Math.floor(elapsedMillis / 1000));
    if (durationSeconds < MIN_RECORDABLE_SESSION_SECONDS) {
      return;
    }

    let userId = sessionUserIdRef.current;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id?.trim() || null;
      sessionUserIdRef.current = userId;
    }

    if (!userId) {
      return;
    }

    const nextScript = resolvedScriptText.trim();
    if (!nextScript) {
      return;
    }

    await recordSoloSession({
      durationSeconds: Math.min(totalSeconds, durationSeconds),
      intention: activePrayerTitle,
      scriptText: nextScript,
      userId,
    });
    recordedSessionAudioKeyRef.current = activeAudioKey;
  }, [activeAudioKey, activePrayerTitle, elapsedMillis, resolvedScriptText, totalSeconds]);

  const onExitSession = useCallback(() => {
    closeAllSelectors();

    void (async () => {
      try {
        await recordSessionIfNeeded();
      } catch {
        // Non-blocking; session recording should not block room exit.
      }
      await stop();
      navigation.goBack();
    })();
  }, [closeAllSelectors, navigation, recordSessionIfNeeded, stop]);

  const loadSelectedScript = useCallback(async () => {
    if (!scriptLookupTitle && !prayerLibraryItemId) {
      return;
    }

    const shouldShowBlockingLoader =
      !scriptTextRef.current.trim() && fallbackScript.trim().length === 0;
    if (shouldShowBlockingLoader) {
      setLoadingScript(true);
    }

    try {
      const script = await fetchPrayerScriptVariantByTitle({
        durationMinutes: selectedMinutes,
        prayerLibraryItemId,
        title: scriptLookupTitle,
      });

      if (script) {
        setScriptText(script);
      } else if (!scriptTextRef.current.trim()) {
        setScriptText(fallbackScript);
      }
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load prayer script.');
    } finally {
      setLoadingScript(false);
    }
  }, [fallbackScript, prayerLibraryItemId, scriptLookupTitle, selectedMinutes]);

  useEffect(() => {
    scriptTextRef.current = scriptText;
  }, [scriptText]);

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
        if (
          !hasRouteDurationMinutes &&
          MINUTE_OPTIONS.includes(preferredMinutes as (typeof MINUTE_OPTIONS)[number])
        ) {
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

        sessionUserIdRef.current = data.user.id;
      } catch {
        // Non-blocking for UI.
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [hasRouteDurationMinutes]);

  useEffect(() => {
    recordedSessionAudioKeyRef.current = null;
  }, [activeAudioKey]);

  useEffect(() => {
    return () => {
      void recordSessionIfNeeded();
    };
  }, [recordSessionIfNeeded]);

  useEffect(() => {
    void loadSelectedScript();
  }, [loadSelectedScript]);

  useEffect(() => {
    if (!scriptLookupTitle && !prayerLibraryItemId) {
      return;
    }

    for (const durationMinutes of MINUTE_OPTIONS) {
      if (durationMinutes === selectedMinutes) {
        continue;
      }

      prefetchPrayerScriptVariantByTitle({
        durationMinutes,
        ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
        title: scriptLookupTitle,
      });
    }
  }, [prayerLibraryItemId, scriptLookupTitle, selectedMinutes]);

  useEffect(() => {
    const nextScript = resolvedScriptText.trim();
    if (!nextScript) {
      return;
    }

    prefetchPrayerAudio({
      allowGeneration: allowAudioGeneration,
      durationMinutes: selectedMinutes,
      language: 'en',
      ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
      script: nextScript,
      title: activePrayerTitle,
      voiceId: activeVoiceId,
    });
  }, [
    allowAudioGeneration,
    activePrayerTitle,
    activeVoiceId,
    prayerLibraryItemId,
    resolvedScriptText,
    selectedMinutes,
  ]);

  useEffect(() => {
    if (elapsedMillis < totalMillis) {
      return;
    }

    void (async () => {
      try {
        await recordSessionIfNeeded();
      } catch {
        // Non-blocking metrics recording.
      }
      await stop();
    })();
  }, [elapsedMillis, recordSessionIfNeeded, stop, totalMillis]);

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

  useEffect(() => {
    if (reduceMotionEnabled) {
      headerIntro.setValue(1);
      stageIntro.setValue(1);
      transportIntro.setValue(1);
      return;
    }

    headerIntro.setValue(0);
    stageIntro.setValue(0);
    transportIntro.setValue(0);

    const animation = Animated.parallel([
      Animated.timing(headerIntro, {
        duration: motion.room.solo.entryHeaderMs,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(motion.durationMs.fast),
        Animated.timing(stageIntro, {
          duration: motion.room.solo.entryStageMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(motion.durationMs.base),
        Animated.timing(transportIntro, {
          duration: motion.room.solo.entryTransportMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => {
      animation.stop();
    };
  }, [headerIntro, reduceMotionEnabled, stageIntro, transportIntro]);

  useEffect(() => {
    if (reduceMotionEnabled) {
      scriptFocus.setValue(0);
      return;
    }

    const animation = Animated.timing(scriptFocus, {
      duration: motion.durationMs.base,
      easing: Easing.out(Easing.cubic),
      toValue: isRunning ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [isRunning, reduceMotionEnabled, scriptFocus]);

  const onTogglePlayback = useCallback(async () => {
    closeAllSelectors();

    if (isRunning) {
      pause();
      return;
    }

    try {
      await play();
      setError(null);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to generate prayer audio.';
      setError(message);
    }
  }, [closeAllSelectors, isRunning, pause, play]);

  const headerIntroStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: headerIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [0.86, 1],
        }),
        transform: [
          {
            translateY: headerIntro.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      };

  const stageIntroStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: stageIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
        transform: [
          {
            translateY: stageIntro.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      };

  const transportIntroStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: transportIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
        transform: [
          {
            translateY: transportIntro.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      };

  const scriptPanelFocusStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        transform: [
          {
            scale: scriptFocus.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.screenContent}
      scrollable={false}
      variant="solo"
      withTabBarInset={false}
    >
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        onPress={closeAllSelectors}
        style={styles.container}
      >
        <SoloAuraField active />

        <View style={styles.topActionsRow}>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            hitSlop={6}
            onPress={() => setIsFavorite((current) => !current)}
            style={({ pressed }) => [
              styles.iconCircleButton,
              !reduceMotionEnabled && pressed && styles.iconButtonPressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>

          <Pressable
            accessibilityHint="Closes this solo prayer room."
            accessibilityLabel="Close solo session"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onExitSession}
            style={({ pressed }) => [
              styles.iconCircleButton,
              !reduceMotionEnabled && pressed && styles.iconButtonPressed,
            ]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        <Animated.View style={headerIntroStyle}>
          <View style={styles.headerBlock}>
            <Typography
              accessibilityRole="header"
              allowFontScaling={false}
              style={styles.prayerTitle}
              variant="H1"
              weight="bold"
            >
              {activePrayerTitle}
            </Typography>
            <Typography
              allowFontScaling={false}
              color={colors.textSecondary}
              style={styles.soloSubtitle}
              variant="Caption"
            >
              Personal Sanctuary
            </Typography>
          </View>

          <View style={styles.selectorRow}>
            <View style={styles.selectorContainer}>
              <Pressable
                accessibilityHint="Opens voice options for this prayer."
                accessibilityLabel="Voice selection"
                accessibilityRole="button"
                accessibilityState={{ expanded: isVoiceMenuOpen }}
                onPress={(event) => {
                  event.stopPropagation();
                  setIsMinuteMenuOpen(false);
                  setIsVoiceMenuOpen((current) => !current);
                }}
                style={({ pressed }) => [
                  styles.selectorButton,
                  !reduceMotionEnabled && pressed && styles.selectorPressed,
                ]}
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
                      accessibilityLabel={voice}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedVoice === voice }}
                      key={voice}
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedVoice(voice);
                        setIsVoiceMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        selectedVoice === voice && styles.dropdownOptionActive,
                        !reduceMotionEnabled && pressed && styles.dropdownOptionPressed,
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
                accessibilityHint="Opens duration options for this prayer."
                accessibilityLabel="Duration selection"
                accessibilityRole="button"
                accessibilityState={{ expanded: isMinuteMenuOpen }}
                onPress={(event) => {
                  event.stopPropagation();
                  setIsVoiceMenuOpen(false);
                  setIsMinuteMenuOpen((current) => !current);
                }}
                style={({ pressed }) => [
                  styles.selectorButton,
                  styles.minutesSelectorButton,
                  !reduceMotionEnabled && pressed && styles.selectorPressed,
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
                      accessibilityLabel={`${minutes} minutes`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedMinutes === minutes }}
                      key={minutes}
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedMinutes(minutes);
                        setIsMinuteMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        selectedMinutes === minutes && styles.dropdownOptionActive,
                        !reduceMotionEnabled && pressed && styles.dropdownOptionPressed,
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
        </Animated.View>

        <Animated.View style={[styles.centerBlock, stageIntroStyle]}>
          <Pressable
            accessibilityHint="Starts or pauses guided prayer audio."
            accessibilityLabel={isRunning ? 'Pause prayer audio' : 'Play prayer audio'}
            accessibilityRole="button"
            accessibilityState={{
              busy: loadingAudio,
              disabled: loadingAudio || !resolvedScriptText.trim(),
              selected: isRunning,
            }}
            disabled={loadingAudio || !resolvedScriptText.trim()}
            onPress={() => {
              void onTogglePlayback();
            }}
            style={({ pressed }) => [
              styles.playPulseTap,
              !reduceMotionEnabled && pressed && styles.playPressed,
            ]}
          >
            <View style={styles.playPulseContainer}>
              <View accessible={false} importantForAccessibility="no-hide-descendants">
                <LottieView
                  autoPlay={false}
                  loop
                  ref={playPulseRef}
                  source={globeFallbackAnimation}
                  style={styles.playPulseLottie}
                />
              </View>
              <View style={styles.playButtonCore}>
                <MaterialCommunityIcons
                  color={figmaV2Reference.tabs.activeBorder}
                  name={isRunning ? 'pause' : 'play'}
                  size={42}
                />
              </View>
            </View>
          </Pressable>

          <Animated.View style={scriptPanelFocusStyle}>
            <View style={styles.scriptPanelCard}>
              <RoomScriptPanel
                activeTimedWordIndex={activeTimedWordIndex}
                activeTimedWords={activeTimedParagraph?.words}
                fallbackParagraph={fallbackParagraph}
                loading={loadingScript && !resolvedScriptText.trim()}
                loadingMessage="Loading prayer script..."
                maxScriptLines={MAX_SCRIPT_LINES}
                noScriptMessage="No script available for this prayer yet."
                scriptSyncWrapStyle={styles.scriptSyncWrap}
                scriptText={resolvedScriptText}
                scriptTextActiveStyle={styles.scriptTextActive}
                scriptWordActiveStyle={styles.scriptWordActive}
                scriptWordFlowStyle={styles.scriptWordFlow}
                scriptWordStyle={styles.scriptWord}
                scriptWrapStyle={styles.scriptWrap}
              />
            </View>
          </Animated.View>

          {error ? (
            <InlineErrorCard
              message={error}
              style={styles.errorCard}
              title="Could not continue playback"
            />
          ) : null}
        </Animated.View>

        <Animated.View style={transportIntroStyle}>
          <RoomTransportControls
            isInviteOpen={isInviteOpen}
            isMuted={isMuted}
            isRunning={isRunning}
            leftLabel={elapsedLabel}
            onReset={() => {
              void stop();
            }}
            onSelectInviteOption={() => setIsInviteOpen(false)}
            onToggleInvite={() => setIsInviteOpen((current) => !current)}
            onToggleMute={() => setMuted((current) => !current)}
            progress={progress}
            rightLabel={totalLabel}
            styles={{
              bottomActionsRow: styles.bottomActionsRow,
              bottomBlock: styles.bottomBlock,
              bottomIconAction: styles.bottomIconAction,
              dropdownOptionPressed: styles.dropdownOptionPressed,
              inviteButton: styles.inviteButton,
              inviteIconCircle: styles.inviteIconCircle,
              inviteMenu: styles.inviteMenu,
              inviteOption: styles.inviteOption,
              inviteText: styles.inviteText,
              progressFill: styles.progressFill,
              progressLabels: styles.progressLabels,
              progressTrack: styles.progressTrack,
              selectorPressed: styles.selectorPressed,
            }}
          />
        </Animated.View>
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
    opacity: 0.9,
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
  errorCard: {
    minHeight: 44,
    width: '100%',
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
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
  noMotion: {
    opacity: 1,
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
    backgroundColor: roomAtmosphere.solo.transportFill,
    borderColor: roomAtmosphere.solo.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    backgroundColor: roomAtmosphere.solo.transportTrack,
    borderColor: roomAtmosphere.solo.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 16,
    overflow: 'hidden',
  },
  screenContent: {
    flex: 1,
  },
  scriptPanelCard: {
    backgroundColor: roomAtmosphere.solo.panelBackground,
    borderColor: roomAtmosphere.solo.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 198,
    overflow: 'hidden',
    width: '100%',
  },
  scriptSyncWrap: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
    maxHeight: 156,
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
  },
  scriptTextActive: {
    fontSize: 20,
    lineHeight: 29,
    maxWidth: '98%',
    textAlign: 'center',
  },
  scriptWord: {
    color: roomAtmosphere.solo.scriptWord,
    fontSize: 20,
    letterSpacing: 0.1,
    lineHeight: 29,
    marginRight: 2,
  },
  scriptWordActive: {
    color: colors.textPrimary,
    textShadowColor: roomAtmosphere.solo.scriptGlow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
    transform: [{ scale: 1.04 }],
  },
  scriptWordFlow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxHeight: 156,
    maxWidth: '98%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  scriptWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 0,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    width: '100%',
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
  soloSubtitle: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
