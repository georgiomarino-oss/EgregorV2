import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchEventById,
  fetchEventRoomSnapshot,
  fetchEventLibraryItemById,
  getCachedEventById,
  getCachedEventLibraryItemById,
  joinEventRoom,
  leaveEventRoom,
  refreshEventPresence,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, motion, radii, roomAtmosphere, spacing } from '../theme/tokens';
import { RoomScriptPanel } from '../features/room-player/components/RoomScriptPanel';
import { RoomTransportControls } from '../features/room-player/components/RoomTransportControls';
import { useRoomAudioPlayer } from '../features/room-player/hooks/useRoomAudioPlayer';
import { CollectiveEnergyField } from '../features/rooms/components/CollectiveEnergyField';
import { resolveCollectiveEnergyLevel } from '../features/rooms/energyModel';
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

type EventRoomRoute = RouteProp<EventsStackParamList, 'EventRoom'>;
type EventNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventRoom'>;

const VOICE_OPTIONS = ['Oliver', 'Amaya', 'Rainbird', 'Dominic'] as const;
const DEFAULT_ELEVENLABS_VOICE_ID = 'V904i8ujLitGpMyoTznT';
const MAX_SCRIPT_LINES = 4;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;
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

function buildFallbackEventScript(description?: string | null, hostNote?: string | null) {
  return [description?.trim(), hostNote?.trim()]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('\n\n')
    .trim();
}

export function EventRoomScreen() {
  const navigation = useNavigation<EventNavigation>();
  const route = useRoute<EventRoomRoute>();
  const routeScript = route.params?.scriptText?.trim() || '';
  const cachedTemplate =
    !routeScript && route.params?.eventTemplateId
      ? (getCachedEventLibraryItemById(route.params.eventTemplateId) ?? null)
      : null;
  const cachedEvent =
    !routeScript && !cachedTemplate && route.params?.eventId
      ? (getCachedEventById(route.params.eventId) ?? null)
      : null;
  const cachedEventScript = cachedEvent
    ? buildFallbackEventScript(cachedEvent.description, cachedEvent.hostNote)
    : '';
  const initialEventTitle =
    route.params?.eventTitle?.trim() || cachedTemplate?.title || cachedEvent?.title || 'Event Room';
  const initialEventBody =
    routeScript || cachedTemplate?.body || cachedEvent?.description?.trim() || '';
  const initialEventScript =
    routeScript ||
    cachedTemplate?.script?.trim() ||
    cachedTemplate?.body?.trim() ||
    cachedEventScript;
  const initialEventDurationMinutes =
    route.params?.durationMinutes ??
    cachedTemplate?.durationMinutes ??
    cachedEvent?.durationMinutes ??
    10;
  const initialEventStartAt =
    route.params?.scheduledStartAt?.trim() || cachedEvent?.startsAt || new Date().toISOString();
  const hasInitialEventData = Boolean(initialEventScript || cachedTemplate || cachedEvent);
  const allowAudioGeneration = route.params?.allowAudioGeneration === true;
  const eventId = route.params?.eventId?.trim() || '';

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Dominic');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!hasInitialEventData);
  const [error, setError] = useState<string | null>(null);

  const [eventTitle, setEventTitle] = useState(initialEventTitle);
  const [, setEventBody] = useState(initialEventBody);
  const [eventScript, setEventScript] = useState(initialEventScript);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(initialEventDurationMinutes);
  const [eventStartAt, setEventStartAt] = useState(initialEventStartAt);
  const [participantCount, setParticipantCount] = useState(cachedEvent?.participants ?? 0);

  const [nowTick, setNowTick] = useState(() => Date.now());

  const playPulseRef = useRef<LottieView>(null);
  const hasInitialEventDataRef = useRef(hasInitialEventData);
  const autoStartTriggeredRef = useRef(false);
  const eventPresenceUserIdRef = useRef<string | null>(null);
  const presenceJoinedRef = useRef(false);
  const presenceLeftRef = useRef(false);
  const reduceMotionEnabled = useReducedMotion();
  const headerIntro = useMemo(() => new Animated.Value(0), []);
  const metaIntro = useMemo(() => new Animated.Value(0), []);
  const stageIntro = useMemo(() => new Animated.Value(0), []);
  const transportIntro = useMemo(() => new Animated.Value(0), []);
  const scriptFocus = useMemo(() => new Animated.Value(0), []);
  const liveMetaPulse = useMemo(() => new Animated.Value(0), []);

  const startMillis = useMemo(() => new Date(eventStartAt).getTime(), [eventStartAt]);
  const durationMillis = useMemo(
    () => Math.max(1, eventDurationMinutes) * 60 * 1000,
    [eventDurationMinutes],
  );
  const endMillis = useMemo(() => startMillis + durationMillis, [durationMillis, startMillis]);

  const hasStarted = Number.isFinite(startMillis) ? nowTick >= startMillis : true;
  const hasEnded = Number.isFinite(endMillis) ? nowTick >= endMillis : false;
  const remainingUntilStartMillis = Math.max(0, startMillis - nowTick);
  const remainingEventMillis = hasStarted ? Math.max(0, endMillis - nowTick) : durationMillis;
  const elapsedFromScheduleMillis = hasStarted
    ? Math.max(0, Math.min(durationMillis, nowTick - startMillis))
    : 0;

  const activeVoiceId = ELEVENLABS_VOICE_ID_BY_LABEL[selectedVoice] ?? DEFAULT_ELEVENLABS_VOICE_ID;
  const activeAudioKey = useMemo(
    () => `${activeVoiceId}|${eventScript.trim()}`,
    [activeVoiceId, eventScript],
  );

  const {
    ensureAudioPlayer,
    isMuted,
    isRunning,
    loadingAudio,
    pause,
    play,
    positionMillis: playerPositionMillis,
    seekTo,
    setMuted,
    stop,
    timedWords,
  } = useRoomAudioPlayer({
    activeAudioKey,
    allowAudioGeneration,
    durationMinutes: eventDurationMinutes,
    scriptText: eventScript,
    title: eventTitle,
    voiceId: activeVoiceId,
  });

  const activeElapsedMillis = hasStarted ? elapsedFromScheduleMillis : playerPositionMillis;
  const collectiveEnergyLevel = useMemo(
    () => resolveCollectiveEnergyLevel(participantCount),
    [participantCount],
  );
  const isCollectiveRoomLive = hasStarted && !hasEnded;
  const isPlaybackDisabled =
    loadingEvent || loadingAudio || !eventScript.trim() || !hasStarted || hasEnded;
  const progress = durationMillis > 0 ? Math.min(1, activeElapsedMillis / durationMillis) : 0;

  const elapsedLabel = formatClock(activeElapsedMillis / 1000);
  const remainingLabel = formatClock(remainingEventMillis / 1000);
  const startCountdownLabel = formatClock(remainingUntilStartMillis / 1000);

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  useEffect(() => {
    presenceJoinedRef.current = false;
    presenceLeftRef.current = false;
  }, [eventId]);

  const leavePresence = useCallback(async () => {
    if (!eventId || presenceLeftRef.current || !presenceJoinedRef.current) {
      return;
    }

    const userId = eventPresenceUserIdRef.current;
    if (!userId) {
      return;
    }

    presenceLeftRef.current = true;
    try {
      await leaveEventRoom(eventId, userId);
    } catch {
      // Presence cleanup is best-effort.
    }
  }, [eventId]);

  const onExitSession = useCallback(() => {
    closeAllSelectors();

    void (async () => {
      await stop();
      await leavePresence();
      navigation.goBack();
    })();
  }, [closeAllSelectors, leavePresence, navigation, stop]);

  const startPlaybackAtScheduleOffset = useCallback(async () => {
    if (!hasStarted || hasEnded) {
      return;
    }

    const offsetMillis = Math.max(0, Math.min(durationMillis, nowTick - startMillis));
    await ensureAudioPlayer();
    await seekTo(offsetMillis);
    await play();
    setError(null);
  }, [durationMillis, ensureAudioPlayer, hasEnded, hasStarted, nowTick, play, seekTo, startMillis]);

  const onTogglePlayback = useCallback(async () => {
    closeAllSelectors();

    if (!hasStarted) {
      setError('This event has not started yet.');
      return;
    }

    if (hasEnded) {
      setError('This event has already ended.');
      return;
    }

    if (isRunning) {
      pause();
      return;
    }

    try {
      await startPlaybackAtScheduleOffset();
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to start event audio.';
      setError(message);
    }
  }, [closeAllSelectors, hasEnded, hasStarted, isRunning, pause, startPlaybackAtScheduleOffset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let active = true;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const initPresence = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      const userId = userError ? null : (data.user?.id?.trim() ?? null);

      if (!active || !userId) {
        return;
      }

      eventPresenceUserIdRef.current = userId;
      presenceLeftRef.current = false;

      try {
        const snapshot = await fetchEventRoomSnapshot(eventId, userId);
        if (!active) {
          return;
        }

        const snapshotEvent = snapshot.event;
        setEventTitle(route.params?.eventTitle?.trim() || snapshotEvent.title);
        setEventDurationMinutes(
          route.params?.durationMinutes ?? snapshotEvent.durationMinutes ?? 10,
        );
        setParticipantCount(snapshot.joinedCount);
        setEventStartAt(
          route.params?.scheduledStartAt?.trim() ||
            snapshotEvent.startsAt ||
            new Date().toISOString(),
        );
      } catch {
        // Non-blocking: room can still proceed with route-provided state.
      }

      try {
        await joinEventRoom(eventId, userId);
        presenceJoinedRef.current = true;
      } catch {
        // Best-effort presence; keep room usable even if this fails.
      }

      heartbeat = setInterval(() => {
        void refreshEventPresence(eventId, userId);
        void fetchEventRoomSnapshot(eventId, userId)
          .then((snapshot) => {
            if (!active) {
              return;
            }

            setParticipantCount(snapshot.joinedCount);
          })
          .catch(() => {
            // Snapshot refresh is best-effort.
          });
      }, PRESENCE_HEARTBEAT_INTERVAL_MS);
    };

    void initPresence();

    return () => {
      active = false;
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      void leavePresence();
    };
  }, [
    eventId,
    leavePresence,
    route.params?.durationMinutes,
    route.params?.eventTitle,
    route.params?.scheduledStartAt,
  ]);

  useEffect(() => {
    let active = true;

    const hydrateEvent = async () => {
      try {
        if (!hasInitialEventDataRef.current) {
          setLoadingEvent(true);
        }

        const nextRouteScript = route.params?.scriptText?.trim();
        if (nextRouteScript && nextRouteScript.length > 0) {
          if (!active) {
            return;
          }

          setEventScript(nextRouteScript);
          setEventBody(nextRouteScript);
          setEventTitle(route.params?.eventTitle?.trim() || 'Event Room');
          setEventDurationMinutes(route.params?.durationMinutes ?? 10);
          setEventStartAt(route.params?.scheduledStartAt?.trim() || new Date().toISOString());
          setParticipantCount(0);
          hasInitialEventDataRef.current = true;
          setError(null);
          return;
        }

        const templateId = route.params?.eventTemplateId?.trim();
        if (templateId) {
          const template = await fetchEventLibraryItemById(templateId);
          if (!active) {
            return;
          }

          if (template) {
            setEventTitle(route.params?.eventTitle?.trim() || template.title);
            setEventBody(template.body);
            setEventScript(template.script || template.body);
            setEventDurationMinutes(
              route.params?.durationMinutes ?? template.durationMinutes ?? 10,
            );
            setEventStartAt(route.params?.scheduledStartAt?.trim() || new Date().toISOString());
            setParticipantCount(0);
            hasInitialEventDataRef.current = true;
            setError(null);
            return;
          }
        }

        const eventId = route.params?.eventId?.trim();
        if (eventId) {
          const event = await fetchEventById(eventId);
          if (!active) {
            return;
          }

          if (event) {
            const fallbackScript = buildFallbackEventScript(event.description, event.hostNote);

            setEventTitle(route.params?.eventTitle?.trim() || event.title);
            setEventBody(event.description?.trim() || 'Hold intention for this live room.');
            setEventScript(
              fallbackScript || 'We gather in shared intention and focus for this event.',
            );
            setEventDurationMinutes(route.params?.durationMinutes ?? event.durationMinutes ?? 10);
            setEventStartAt(
              route.params?.scheduledStartAt?.trim() || event.startsAt || new Date().toISOString(),
            );
            setParticipantCount(event.participants);
            hasInitialEventDataRef.current = true;
            setError(null);
            return;
          }
        }

        if (!active) {
          return;
        }

        setError('Could not find event details for this room.');
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load event room.');
      } finally {
        if (active) {
          setLoadingEvent(false);
        }
      }
    };

    void hydrateEvent();

    return () => {
      active = false;
    };
  }, [
    route.params?.durationMinutes,
    route.params?.eventId,
    route.params?.eventTemplateId,
    route.params?.eventTitle,
    route.params?.scheduledStartAt,
    route.params?.scriptText,
  ]);

  useEffect(() => {
    autoStartTriggeredRef.current = false;
  }, [activeAudioKey, eventStartAt]);

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
      metaIntro.setValue(1);
      stageIntro.setValue(1);
      transportIntro.setValue(1);
      return;
    }

    headerIntro.setValue(0);
    metaIntro.setValue(0);
    stageIntro.setValue(0);
    transportIntro.setValue(0);

    const animation = Animated.parallel([
      Animated.timing(headerIntro, {
        duration: motion.room.collective.entryHeaderMs,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(motion.durationMs.fast),
        Animated.timing(metaIntro, {
          duration: motion.room.collective.entryMetaMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(motion.durationMs.base),
        Animated.timing(stageIntro, {
          duration: motion.room.collective.entryStageMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(motion.durationMs.base + motion.durationMs.fast),
        Animated.timing(transportIntro, {
          duration: motion.room.collective.entryTransportMs,
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
  }, [headerIntro, metaIntro, reduceMotionEnabled, stageIntro, transportIntro]);

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

  useEffect(() => {
    if (!isCollectiveRoomLive || reduceMotionEnabled) {
      liveMetaPulse.stopAnimation();
      liveMetaPulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveMetaPulse, {
          duration: motion.room.collective.liveMetaPulseMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(liveMetaPulse, {
          duration: motion.room.collective.liveMetaPulseMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [isCollectiveRoomLive, liveMetaPulse, reduceMotionEnabled]);

  useEffect(() => {
    if (!hasStarted || hasEnded || loadingEvent || autoStartTriggeredRef.current) {
      return;
    }

    autoStartTriggeredRef.current = true;

    void startPlaybackAtScheduleOffset().catch((nextError) => {
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to start event audio.';
      setError(message);
    });
  }, [hasEnded, hasStarted, loadingEvent, startPlaybackAtScheduleOffset]);

  useEffect(() => {
    if (!hasEnded) {
      return;
    }

    void stop();
  }, [hasEnded, stop]);

  useEffect(() => {
    const nextScript = eventScript.trim();
    if (!nextScript) {
      return;
    }

    prefetchPrayerAudio({
      allowGeneration: allowAudioGeneration,
      durationMinutes: eventDurationMinutes,
      language: 'en',
      script: nextScript,
      title: eventTitle,
      voiceId: activeVoiceId,
    });
  }, [activeVoiceId, allowAudioGeneration, eventDurationMinutes, eventScript, eventTitle]);

  const activeTimedWordIndex = useMemo(
    () => findActiveTimedWordIndex(timedWords, activeElapsedMillis),
    [activeElapsedMillis, timedWords],
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
    const previewParagraphs = buildPreviewParagraphsFromScript(eventScript);
    if (previewParagraphs.length > 0) {
      return previewParagraphs;
    }

    return splitScriptIntoParagraphs(eventScript);
  }, [eventScript]);

  const fallbackParagraphIndex = useMemo(
    () =>
      resolveFallbackParagraphIndex({
        elapsedMillis: activeElapsedMillis,
        paragraphCount: scriptParagraphs.length,
        totalMillis: durationMillis,
      }),
    [activeElapsedMillis, durationMillis, scriptParagraphs.length],
  );

  const fallbackParagraph = scriptParagraphs[fallbackParagraphIndex] ?? '';

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

  const metaIntroStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: metaIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
        transform: [
          {
            translateY: metaIntro.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
          {
            scale: liveMetaPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  const stageIntroStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: stageIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [0.78, 1],
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
              outputRange: [1, 1 + motion.amplitude.medium],
            }),
          },
        ],
      };

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.screenContent}
      scrollable={false}
      variant="eventRoom"
      withTabBarInset={false}
    >
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        onPress={closeAllSelectors}
        style={styles.container}
      >
        <CollectiveEnergyField energyLevel={collectiveEnergyLevel} isLive={isCollectiveRoomLive} />

        <View style={styles.topActionsRow}>
          <View style={styles.iconSpacer} />

          <Pressable
            accessibilityHint="Closes this event room."
            accessibilityLabel="Close event room"
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
              {eventTitle}
            </Typography>
          </View>
        </Animated.View>

        <Animated.View style={metaIntroStyle}>
          <View style={styles.collectiveMetaRow}>
            <View
              style={[
                styles.liveChip,
                isCollectiveRoomLive
                  ? styles.liveChipActive
                  : hasEnded
                    ? styles.liveChipEnded
                    : styles.liveChipSoon,
              ]}
            >
              <Typography
                allowFontScaling={false}
                color={colors.textPrimary}
                variant="Caption"
                weight="bold"
              >
                {isCollectiveRoomLive ? 'Live' : hasEnded ? 'Ended' : 'Soon'}
              </Typography>
            </View>

            <View style={styles.collectiveStatsChip}>
              <LiveLogo size={20} />
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                variant="Caption"
                weight="bold"
              >
                {`${participantCount} joined`}
              </Typography>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={headerIntroStyle}>
          <View style={styles.selectorRow}>
            <View style={styles.selectorContainer}>
              <Pressable
                accessibilityHint="Opens voice options for this event room."
                accessibilityLabel="Voice selection"
                accessibilityRole="button"
                accessibilityState={{ expanded: isVoiceMenuOpen }}
                onPress={(event) => {
                  event.stopPropagation();
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
              <View style={[styles.selectorButton, styles.minutesSelectorButton]}>
                <Typography
                  adjustsFontSizeToFit
                  allowFontScaling={false}
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={styles.selectorValue}
                  variant="Body"
                  weight="bold"
                >
                  {hasStarted ? `${remainingLabel} left` : `${startCountdownLabel} to start`}
                </Typography>
                <MaterialCommunityIcons
                  color={hasStarted ? colors.success : colors.warning}
                  name={hasStarted ? 'clock-check-outline' : 'clock-outline'}
                  size={20}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.centerBlock, stageIntroStyle]}>
          <Pressable
            accessibilityHint="Starts or pauses event room audio."
            accessibilityLabel={isRunning ? 'Pause event audio' : 'Play event audio'}
            accessibilityRole="button"
            accessibilityState={{
              busy: loadingAudio || loadingEvent,
              disabled: isPlaybackDisabled,
              selected: isRunning,
            }}
            disabled={isPlaybackDisabled}
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
                loading={loadingEvent}
                loadingMessage="Loading event details..."
                maxScriptLines={MAX_SCRIPT_LINES}
                noScriptMessage="No script available for this event."
                scriptSyncWrapStyle={styles.scriptSyncWrap}
                scriptText={eventScript}
                scriptTextActiveStyle={styles.scriptTextActive}
                scriptWordActiveStyle={styles.scriptWordActive}
                scriptWordFlowStyle={styles.scriptWordFlow}
                scriptWordStyle={styles.scriptWord}
                scriptWrapStyle={styles.scriptWrap}
              />
            </View>
          </Animated.View>

          {!hasStarted ? (
            <Typography allowFontScaling={false} color={colors.warning} variant="Caption">
              Event starts in {startCountdownLabel}. Audio will begin automatically.
            </Typography>
          ) : null}

          {hasEnded ? (
            <Typography allowFontScaling={false} color={colors.success} variant="Caption">
              This event has ended.
            </Typography>
          ) : null}

          {error ? (
            <InlineErrorCard
              message={error}
              style={styles.errorCard}
              title="Could not continue room playback"
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
            rightLabel={remainingLabel}
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
    opacity: 0.94,
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
  collectiveMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  collectiveStatsChip: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
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
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  iconSpacer: {
    width: 52,
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
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
  liveChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  liveChipActive: {
    backgroundColor: roomAtmosphere.collective.liveChipBackground,
    borderColor: roomAtmosphere.collective.liveChipBorder,
  },
  liveChipEnded: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderMedium,
  },
  liveChipSoon: {
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
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
    backgroundColor: roomAtmosphere.collective.transportFill,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    backgroundColor: roomAtmosphere.collective.transportTrack,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 16,
    overflow: 'hidden',
  },
  screenContent: {
    flex: 1,
  },
  scriptPanelCard: {
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.panelBorder,
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
    color: roomAtmosphere.collective.scriptWord,
    fontSize: 20,
    letterSpacing: 0.1,
    lineHeight: 29,
    marginRight: 2,
  },
  scriptWordActive: {
    color: colors.textPrimary,
    textShadowColor: roomAtmosphere.collective.scriptGlow,
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
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
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
