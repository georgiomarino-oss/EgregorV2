import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import {
  fetchEventNotificationState,
  fetchEventLibraryItemById,
  fetchEventsCircleMembers,
  type EventJoinTarget,
  fetchEventRoomSnapshot,
  getCachedEventsCircleMembers,
  getCachedEventById,
  getCachedEventLibraryItemById,
  joinEventRoom,
  leaveEventRoom,
  refreshEventPresence,
  setEventNotificationSubscription,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import {
  buildEventInviteMessage,
  buildEventInviteUrl,
  buildEventShareMessage,
} from '../lib/invite';
import { supabase } from '../lib/supabase';
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

function formatCountdownPhrase(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(clamped / 86_400);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (days > 0) {
    const remainingHours = Math.floor((clamped % 86_400) / 3600);
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

function buildFallbackEventScript(description?: string | null, hostNote?: string | null) {
  return [description?.trim(), hostNote?.trim()]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('\n\n')
    .trim();
}

function toEventRoomSafeErrorMessage(error: unknown, fallback: string) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  const normalized = rawMessage.toLowerCase();

  let safeMessage = fallback;

  if (
    normalized.includes('quota_exceeded') ||
    normalized.includes('credits remaining') ||
    normalized.includes('credits')
  ) {
    safeMessage = 'Audio generation is temporarily unavailable. Continue with the guided text.';
  } else if (normalized.includes('no pre-generated audio artifact')) {
    safeMessage = 'Audio is not ready for this room yet. Continue with the guided text.';
  } else if (
    normalized.includes('schema cache') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist')
  ) {
    safeMessage = 'Room services are temporarily unavailable. Please try again shortly.';
  } else if (normalized.includes('permission') || normalized.includes('forbidden')) {
    safeMessage = 'You do not have access to this room.';
  } else if (
    normalized.includes('not found') &&
    (normalized.includes('event') || normalized.includes('room'))
  ) {
    safeMessage = 'This room is no longer available.';
  }

  if (__DEV__ && safeMessage !== rawMessage) {
    console.warn('[Egregor][EventRoom]', safeMessage, rawMessage);
  }

  return safeMessage;
}

export function EventRoomScreen() {
  const navigation = useNavigation<EventNavigation>();
  const route = useRoute<EventRoomRoute>();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const routeOccurrenceId = route.params?.occurrenceId?.trim() || '';
  const routeEventTemplateId = route.params?.eventTemplateId?.trim() || '';
  const routeOccurrenceKey = route.params?.occurrenceKey?.trim() || '';
  const routeRoomId = route.params?.roomId?.trim() || '';
  const rawRouteLegacyEventId = route.params?.eventId?.trim() || '';
  const hasCanonicalIdentifiers = Boolean(routeOccurrenceId || routeOccurrenceKey || routeRoomId);
  const routeLegacyEventId = hasCanonicalIdentifiers ? '' : rawRouteLegacyEventId;
  const routeScript = route.params?.scriptText?.trim() || '';
  const cachedTemplate =
    !routeScript && !hasCanonicalIdentifiers && routeEventTemplateId
      ? (getCachedEventLibraryItemById(routeEventTemplateId) ?? null)
      : null;
  const cachedEvent =
    !routeScript && !cachedTemplate && routeLegacyEventId
      ? (getCachedEventById(routeLegacyEventId) ?? null)
      : null;
  const cachedEventScript = cachedEvent
    ? buildFallbackEventScript(cachedEvent.description, cachedEvent.hostNote)
    : '';
  const initialEventTitle =
    route.params?.eventTitle?.trim() || cachedTemplate?.title || cachedEvent?.title || 'Live Room';
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
  const joinTarget = useMemo<EventJoinTarget>(
    () => ({
      ...(routeLegacyEventId ? { legacyEventId: routeLegacyEventId } : {}),
      ...(routeOccurrenceId ? { occurrenceId: routeOccurrenceId } : {}),
      ...(routeOccurrenceKey ? { occurrenceKey: routeOccurrenceKey } : {}),
      ...(routeRoomId ? { roomId: routeRoomId } : {}),
    }),
    [routeLegacyEventId, routeOccurrenceId, routeOccurrenceKey, routeRoomId],
  );
  const joinTargetKey = useMemo(
    () =>
      [
        joinTarget.legacyEventId ?? '',
        joinTarget.occurrenceId ?? '',
        joinTarget.occurrenceKey ?? '',
        joinTarget.roomId ?? '',
      ].join('|'),
    [joinTarget],
  );
  const hasCanonicalJoinTarget = Boolean(
    routeLegacyEventId || routeOccurrenceId || routeOccurrenceKey || routeRoomId,
  );

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Dominic');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!hasInitialEventData);
  const [error, setError] = useState<string | null>(null);
  const [presenceUserId, setPresenceUserId] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [updatingReminder, setUpdatingReminder] = useState(false);
  const [resolvedOccurrenceId, setResolvedOccurrenceId] = useState(routeOccurrenceId);
  const [resolvedRoomId, setResolvedRoomId] = useState(routeRoomId);

  const [eventTitle, setEventTitle] = useState(initialEventTitle);
  const [, setEventBody] = useState(initialEventBody);
  const [eventScript, setEventScript] = useState(initialEventScript);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(initialEventDurationMinutes);
  const [eventStartAt, setEventStartAt] = useState(initialEventStartAt);
  const [participantCount, setParticipantCount] = useState(cachedEvent?.participants ?? 0);

  const [nowTick, setNowTick] = useState(() => Date.now());

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

  const parsedStartMillis = useMemo(() => new Date(eventStartAt).getTime(), [eventStartAt]);
  const hasValidStartMillis = Number.isFinite(parsedStartMillis);
  const startMillis = hasValidStartMillis ? parsedStartMillis : nowTick;
  const durationMillis = useMemo(
    () => Math.max(1, eventDurationMinutes) * 60 * 1000,
    [eventDurationMinutes],
  );
  const endMillis = useMemo(() => startMillis + durationMillis, [durationMillis, startMillis]);

  const hasStarted = nowTick >= startMillis;
  const hasEnded = nowTick >= endMillis;
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
  const startCountdownPhrase = hasValidStartMillis
    ? formatCountdownPhrase(remainingUntilStartMillis / 1000)
    : 'soon';
  const roomStateLabel = isCollectiveRoomLive ? 'Live now' : hasEnded ? 'Ended' : 'Waiting room';
  const roomStateDescription = isCollectiveRoomLive
    ? 'This room is active. Join the shared session now.'
    : hasEnded
      ? 'This room has ended. You can still review details and reminders.'
      : `You are early. This shared room goes live in ${startCountdownPhrase}.`;
  const reminderActionLabel = updatingReminder
    ? 'Saving reminder...'
    : reminderEnabled
      ? 'Reminder on'
      : 'Save reminder';
  const canToggleReminder = Boolean(presenceUserId && resolvedOccurrenceId);
  const isVeryCompactHeight = viewportHeight <= 700;
  const isCompactHeight = viewportHeight <= 780;
  const isNarrowWidth = viewportWidth <= 360;
  const useCompactLayout = isCompactHeight || isNarrowWidth;

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  useEffect(() => {
    presenceJoinedRef.current = false;
    presenceLeftRef.current = false;
    setResolvedOccurrenceId(routeOccurrenceId);
    setResolvedRoomId(routeRoomId);
  }, [joinTargetKey]);

  const leavePresence = useCallback(async () => {
    if (!hasCanonicalJoinTarget || presenceLeftRef.current || !presenceJoinedRef.current) {
      return;
    }

    const userId = eventPresenceUserIdRef.current;
    if (!userId) {
      return;
    }

    presenceLeftRef.current = true;
    try {
      await leaveEventRoom(joinTarget, userId);
    } catch {
      // Presence cleanup is best-effort.
    }
  }, [hasCanonicalJoinTarget, joinTarget]);

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
      setError('This live room has not started yet.');
      return;
    }

    if (hasEnded) {
      setError('This live room has already ended.');
      return;
    }

    if (isRunning) {
      pause();
      return;
    }

    try {
      await startPlaybackAtScheduleOffset();
    } catch (nextError) {
      setError(toEventRoomSafeErrorMessage(nextError, 'Unable to start room audio right now.'));
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
    if (!hasCanonicalJoinTarget) {
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
      setPresenceUserId(userId);
      presenceLeftRef.current = false;

      try {
        const snapshot = await fetchEventRoomSnapshot(joinTarget, userId);
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
        if (snapshot.occurrenceId) {
          setResolvedOccurrenceId(snapshot.occurrenceId);
        }
        if (snapshot.roomId) {
          setResolvedRoomId(snapshot.roomId);
        }
      } catch {
        // Non-blocking: room can still proceed with route-provided state.
      }

      try {
        await joinEventRoom(joinTarget, userId);
        presenceJoinedRef.current = true;
      } catch {
        // Best-effort presence; keep room usable even if this fails.
      }

      heartbeat = setInterval(() => {
        void refreshEventPresence(joinTarget, userId);
        void fetchEventRoomSnapshot(joinTarget, userId)
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
    hasCanonicalJoinTarget,
    joinTarget,
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

        if (hasCanonicalJoinTarget) {
          const snapshot = await fetchEventRoomSnapshot(joinTarget, '');
          if (!active) {
            return;
          }

          const snapshotEvent = snapshot.event;
          const fallbackScript = buildFallbackEventScript(
            snapshotEvent.description,
            snapshotEvent.hostNote,
          );

          setEventTitle(route.params?.eventTitle?.trim() || snapshotEvent.title);
          setEventBody(snapshotEvent.description?.trim() || 'Hold intention for this live room.');
          setEventScript(
            fallbackScript || 'We gather in shared intention and focus for this live room.',
          );
          setEventDurationMinutes(
            route.params?.durationMinutes ?? snapshotEvent.durationMinutes ?? 10,
          );
          setEventStartAt(
            route.params?.scheduledStartAt?.trim() ||
              snapshotEvent.startsAt ||
              new Date().toISOString(),
          );
          setParticipantCount(snapshot.joinedCount);
          if (snapshot.occurrenceId) {
            setResolvedOccurrenceId(snapshot.occurrenceId);
          }
          if (snapshot.roomId) {
            setResolvedRoomId(snapshot.roomId);
          }
          hasInitialEventDataRef.current = true;
          setError(null);
          return;
        }

        const nextRouteScript = route.params?.scriptText?.trim();
        if (nextRouteScript && nextRouteScript.length > 0) {
          if (!active) {
            return;
          }

          setEventScript(nextRouteScript);
          setEventBody(nextRouteScript);
          setEventTitle(route.params?.eventTitle?.trim() || 'Live Room');
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

        if (!active) {
          return;
        }

        setError('Could not find live room details for this room.');
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(toEventRoomSafeErrorMessage(nextError, 'Unable to load this room right now.'));
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
    hasCanonicalJoinTarget,
    joinTarget,
    route.params?.durationMinutes,
    route.params?.eventId,
    route.params?.occurrenceId,
    route.params?.eventTemplateId,
    route.params?.eventTitle,
    route.params?.occurrenceKey,
    route.params?.roomId,
    route.params?.scheduledStartAt,
    route.params?.scriptText,
  ]);

  useEffect(() => {
    autoStartTriggeredRef.current = false;
  }, [activeAudioKey, eventStartAt]);

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
      setError(toEventRoomSafeErrorMessage(nextError, 'Unable to start room audio right now.'));
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

  const centerOrbStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: scriptFocus.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
        transform: [
          {
            scale: scriptFocus.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.pronounced],
            }),
          },
        ],
      };

  const resolveEventsCircleMembers = useCallback(async () => {
    const cachedMembers = getCachedEventsCircleMembers();
    if (cachedMembers) {
      return cachedMembers;
    }

    try {
      return await fetchEventsCircleMembers();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!presenceUserId || !resolvedOccurrenceId) {
      setReminderEnabled(false);
      return;
    }

    let active = true;
    const loadReminderState = async () => {
      try {
        const state = await fetchEventNotificationState(presenceUserId);
        if (!active) {
          return;
        }
        const key = `occurrence:${resolvedOccurrenceId}`;
        setReminderEnabled(state.subscribedAll || state.subscriptionKeys.includes(key));
      } catch {
        if (!active) {
          return;
        }
        setReminderEnabled(false);
      }
    };

    void loadReminderState();
    return () => {
      active = false;
    };
  }, [presenceUserId, resolvedOccurrenceId]);

  const toggleOccurrenceReminder = useCallback(async () => {
    if (!presenceUserId || !resolvedOccurrenceId) {
      setError('Sign in to save reminders for this live room.');
      return;
    }

    setUpdatingReminder(true);
    try {
      await setEventNotificationSubscription({
        enabled: !reminderEnabled,
        subscriptionKey: `occurrence:${resolvedOccurrenceId}`,
        userId: presenceUserId,
      });
      setReminderEnabled((current) => !current);
      setError(null);
    } catch (nextError) {
      setError(
        toEventRoomSafeErrorMessage(nextError, 'Could not update reminder for this live room.'),
      );
    } finally {
      setUpdatingReminder(false);
    }
  }, [presenceUserId, reminderEnabled, resolvedOccurrenceId]);

  const onSelectInviteOption = useCallback(
    (option: string) => {
      setIsInviteOpen(false);

      const normalizedOption = option.trim().toLowerCase();
      void (async () => {
        try {
          const inviteContext = {
            durationMinutes: eventDurationMinutes,
            eventTitle,
            scheduledStartAt: eventStartAt,
            ...(resolvedOccurrenceId ? { occurrenceId: resolvedOccurrenceId } : {}),
            ...(routeOccurrenceKey ? { occurrenceKey: routeOccurrenceKey } : {}),
            ...(resolvedRoomId ? { roomId: resolvedRoomId } : {}),
          };

          if (normalizedOption === 'copy invite link') {
            await Clipboard.setStringAsync(buildEventInviteUrl(inviteContext));
            Alert.alert(
              'Invite link copied',
              'The live room invite link is now on your clipboard.',
            );
            return;
          }

          const message =
            normalizedOption === 'invite your circle'
              ? buildEventInviteMessage({
                  ...inviteContext,
                  members: await resolveEventsCircleMembers(),
                })
              : buildEventShareMessage(inviteContext);

          await Share.share({
            message,
            title: 'Invite to Live Room',
          });
        } catch (nextError) {
          const detail = toEventRoomSafeErrorMessage(
            nextError,
            'Unable to share the invite right now.',
          );
          Alert.alert('Invite failed', detail);
        }
      })();
    },
    [
      eventDurationMinutes,
      eventStartAt,
      eventTitle,
      resolveEventsCircleMembers,
      routeOccurrenceKey,
      resolvedOccurrenceId,
      resolvedRoomId,
    ],
  );

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
        style={[
          styles.container,
          useCompactLayout && styles.containerCompact,
          isVeryCompactHeight && styles.containerVeryCompact,
        ]}
      >
        <CollectiveEnergyField
          energyLevel={collectiveEnergyLevel}
          isLive={isCollectiveRoomLive && isRunning}
        />

        <View
          style={[
            styles.topActionsRow,
            useCompactLayout && styles.topActionsRowCompact,
            isVeryCompactHeight && styles.topActionsRowVeryCompact,
          ]}
        >
          <View
            style={[
              styles.iconSpacer,
              useCompactLayout && styles.iconSpacerCompact,
              isVeryCompactHeight && styles.iconSpacerVeryCompact,
            ]}
          />

          <Pressable
            accessibilityHint="Closes this live room."
            accessibilityLabel="Close live room"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onExitSession}
            style={({ pressed }) => [
              styles.iconCircleButton,
              useCompactLayout && styles.iconCircleButtonCompact,
              isVeryCompactHeight && styles.iconCircleButtonVeryCompact,
              !reduceMotionEnabled && pressed && styles.iconButtonPressed,
            ]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        <Animated.View style={headerIntroStyle}>
          <View style={[styles.headerBlock, useCompactLayout && styles.headerBlockCompact]}>
            <Typography
              accessibilityRole="header"
              allowFontScaling={false}
              style={[
                styles.prayerTitle,
                useCompactLayout && styles.prayerTitleCompact,
                isVeryCompactHeight && styles.prayerTitleVeryCompact,
              ]}
              variant="H1"
              weight="bold"
            >
              {eventTitle}
            </Typography>
          </View>
        </Animated.View>

        <Animated.View style={metaIntroStyle}>
          <View
            style={[
              styles.collectiveMetaRow,
              useCompactLayout && styles.collectiveMetaRowCompact,
              isVeryCompactHeight && styles.collectiveMetaRowVeryCompact,
            ]}
          >
            <View
              style={[
                styles.liveChip,
                useCompactLayout && styles.liveChipCompact,
                isVeryCompactHeight && styles.liveChipVeryCompact,
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

            <View
              style={[
                styles.collectiveStatsChip,
                useCompactLayout && styles.collectiveStatsChipCompact,
                isVeryCompactHeight && styles.collectiveStatsChipVeryCompact,
              ]}
            >
              <LiveLogo context="eventRoom" size={20} />
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

        <Animated.View style={metaIntroStyle}>
          <View style={styles.waitingStateCard}>
            <Typography
              allowFontScaling={false}
              color={colors.textPrimary}
              variant="Caption"
              weight="bold"
            >
              {roomStateLabel}
            </Typography>
            <Typography
              allowFontScaling={false}
              color={colors.textSecondary}
              style={styles.waitingStateBody}
              variant="Caption"
            >
              {roomStateDescription}
            </Typography>
            {resolvedOccurrenceId ? (
              <Pressable
                accessibilityHint="Saves or removes reminder for this live room."
                accessibilityLabel={reminderActionLabel}
                accessibilityRole="button"
                accessibilityState={{
                  busy: updatingReminder,
                  disabled: !canToggleReminder || updatingReminder,
                  selected: reminderEnabled,
                }}
                disabled={!canToggleReminder || updatingReminder}
                onPress={() => {
                  void toggleOccurrenceReminder();
                }}
                style={({ pressed }) => [
                  styles.reminderToggle,
                  reminderEnabled && styles.reminderToggleActive,
                  !reduceMotionEnabled && pressed && styles.selectorPressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={reminderEnabled ? colors.textPrimary : colors.textSecondary}
                  name={reminderEnabled ? 'bell-ring' : 'bell-outline'}
                  size={16}
                />
                <Typography
                  allowFontScaling={false}
                  color={reminderEnabled ? colors.textPrimary : colors.textSecondary}
                  style={styles.reminderToggleText}
                  variant="Caption"
                  weight="bold"
                >
                  {reminderActionLabel}
                </Typography>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View style={headerIntroStyle}>
          <View
            style={[
              styles.selectorRow,
              useCompactLayout && styles.selectorRowCompact,
              isVeryCompactHeight && styles.selectorRowVeryCompact,
            ]}
          >
            <View style={styles.selectorContainer}>
              <Pressable
                accessibilityHint="Opens voice options for this live room."
                accessibilityLabel="Voice selection"
                accessibilityRole="button"
                accessibilityState={{ expanded: isVoiceMenuOpen }}
                onPress={(event) => {
                  event.stopPropagation();
                  setIsVoiceMenuOpen((current) => !current);
                }}
                style={({ pressed }) => [
                  styles.selectorButton,
                  useCompactLayout && styles.selectorButtonCompact,
                  isVeryCompactHeight && styles.selectorButtonVeryCompact,
                  !reduceMotionEnabled && pressed && styles.selectorPressed,
                ]}
              >
                <View
                  style={[
                    styles.voiceAvatar,
                    useCompactLayout && styles.voiceAvatarCompact,
                    isVeryCompactHeight && styles.voiceAvatarVeryCompact,
                  ]}
                >
                  <MaterialCommunityIcons color={colors.textPrimary} name="account" size={12} />
                </View>
                <Typography
                  adjustsFontSizeToFit
                  allowFontScaling={false}
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.selectorValue,
                    useCompactLayout && styles.selectorValueCompact,
                    isVeryCompactHeight && styles.selectorValueVeryCompact,
                  ]}
                  variant="Body"
                  weight="bold"
                >
                  {selectedVoice}
                </Typography>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name={isVoiceMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                />
              </Pressable>

              {isVoiceMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {VOICE_OPTIONS.map((voice) => {
                    const isSelected = selectedVoice === voice;
                    return (
                      <Pressable
                        accessibilityLabel={voice}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={voice}
                        onPress={(event) => {
                          event.stopPropagation();
                          setSelectedVoice(voice);
                          setIsVoiceMenuOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionActive,
                          !reduceMotionEnabled && pressed && styles.dropdownOptionPressed,
                        ]}
                      >
                        <Typography
                          allowFontScaling={false}
                          color={
                            isSelected
                              ? roomAtmosphere.collective.transportFill
                              : colors.textPrimary
                          }
                          variant="Body"
                          weight="bold"
                        >
                          {voice}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.selectorContainer}>
              <View
                style={[
                  styles.selectorButton,
                  styles.minutesSelectorButton,
                  useCompactLayout && styles.selectorButtonCompact,
                  isVeryCompactHeight && styles.selectorButtonVeryCompact,
                ]}
              >
                <Typography
                  adjustsFontSizeToFit
                  allowFontScaling={false}
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.selectorValue,
                    useCompactLayout && styles.selectorValueCompact,
                    isVeryCompactHeight && styles.selectorValueVeryCompact,
                  ]}
                  variant="Body"
                  weight="bold"
                >
                  {hasStarted ? `${remainingLabel} left` : `Starts in ${startCountdownPhrase}`}
                </Typography>
                <MaterialCommunityIcons
                  color={hasStarted ? colors.success : colors.warning}
                  name={hasStarted ? 'clock-check-outline' : 'clock-outline'}
                  size={18}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.centerBlock,
            useCompactLayout && styles.centerBlockCompact,
            isVeryCompactHeight && styles.centerBlockVeryCompact,
            stageIntroStyle,
          ]}
        >
          <Pressable
            accessibilityHint="Starts or pauses live room audio."
            accessibilityLabel={isRunning ? 'Pause live room audio' : 'Play live room audio'}
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
            <Animated.View
              style={[
                styles.centerFocalStack,
                useCompactLayout && styles.centerFocalStackCompact,
                isVeryCompactHeight && styles.centerFocalStackVeryCompact,
                centerOrbStyle,
              ]}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.centerHaloOuter,
                  useCompactLayout && styles.centerHaloOuterCompact,
                  isVeryCompactHeight && styles.centerHaloOuterVeryCompact,
                ]}
              />
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.centerHaloInner,
                  useCompactLayout && styles.centerHaloInnerCompact,
                  isVeryCompactHeight && styles.centerHaloInnerVeryCompact,
                ]}
              />
              <View
                style={[
                  styles.playButtonCore,
                  useCompactLayout && styles.playButtonCoreCompact,
                  isVeryCompactHeight && styles.playButtonCoreVeryCompact,
                ]}
              >
                <MaterialCommunityIcons
                  color={roomAtmosphere.collective.transportFill}
                  name={isRunning ? 'pause' : 'play'}
                  size={36}
                />
              </View>
            </Animated.View>
          </Pressable>

          <Animated.View style={scriptPanelFocusStyle}>
            <View
              style={[
                styles.scriptPanelCard,
                useCompactLayout && styles.scriptPanelCardCompact,
                isVeryCompactHeight && styles.scriptPanelCardVeryCompact,
              ]}
            >
              <RoomScriptPanel
                activeTimedWordIndex={activeTimedWordIndex}
                activeTimedWords={activeTimedParagraph?.words}
                fallbackParagraph={fallbackParagraph}
                loading={loadingEvent}
                loadingMessage="Loading live room details..."
                maxScriptLines={MAX_SCRIPT_LINES}
                noScriptMessage="No script available for this live room."
                scriptSyncWrapStyle={[
                  styles.scriptSyncWrap,
                  useCompactLayout && styles.scriptSyncWrapCompact,
                  isVeryCompactHeight && styles.scriptSyncWrapVeryCompact,
                ]}
                scriptText={eventScript}
                scriptTextActiveStyle={[
                  styles.scriptTextActive,
                  useCompactLayout && styles.scriptTextActiveCompact,
                  isVeryCompactHeight && styles.scriptTextActiveVeryCompact,
                ]}
                scriptWordActiveStyle={styles.scriptWordActive}
                scriptWordFlowStyle={[
                  styles.scriptWordFlow,
                  useCompactLayout && styles.scriptWordFlowCompact,
                  isVeryCompactHeight && styles.scriptWordFlowVeryCompact,
                ]}
                scriptWordStyle={[
                  styles.scriptWord,
                  useCompactLayout && styles.scriptWordCompact,
                  isVeryCompactHeight && styles.scriptWordVeryCompact,
                ]}
                scriptWrapStyle={[
                  styles.scriptWrap,
                  useCompactLayout && styles.scriptWrapCompact,
                  isVeryCompactHeight && styles.scriptWrapVeryCompact,
                ]}
              />
            </View>
          </Animated.View>

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
            onSelectInviteOption={onSelectInviteOption}
            onToggleInvite={() => setIsInviteOpen((current) => !current)}
            onToggleMute={() => setMuted((current) => !current)}
            progress={progress}
            rightLabel={remainingLabel}
            styles={{
              bottomActionsRow: [
                styles.bottomActionsRow,
                useCompactLayout && styles.bottomActionsRowCompact,
                isVeryCompactHeight && styles.bottomActionsRowVeryCompact,
              ],
              bottomBlock: [
                styles.bottomBlock,
                useCompactLayout && styles.bottomBlockCompact,
                isVeryCompactHeight && styles.bottomBlockVeryCompact,
              ],
              bottomIconAction: [
                styles.bottomIconAction,
                useCompactLayout && styles.bottomIconActionCompact,
                isVeryCompactHeight && styles.bottomIconActionVeryCompact,
              ],
              dropdownOptionPressed: styles.dropdownOptionPressed,
              inviteButton: [
                styles.inviteButton,
                useCompactLayout && styles.inviteButtonCompact,
                isVeryCompactHeight && styles.inviteButtonVeryCompact,
              ],
              inviteIconCircle: [
                styles.inviteIconCircle,
                useCompactLayout && styles.inviteIconCircleCompact,
                isVeryCompactHeight && styles.inviteIconCircleVeryCompact,
              ],
              inviteMenu: styles.inviteMenu,
              inviteOption: styles.inviteOption,
              inviteText: styles.inviteText,
              progressFill: styles.progressFill,
              progressLabels: [
                styles.progressLabels,
                useCompactLayout && styles.progressLabelsCompact,
              ],
              progressTrack: [
                styles.progressTrack,
                useCompactLayout && styles.progressTrackCompact,
                isVeryCompactHeight && styles.progressTrackVeryCompact,
              ],
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
  bottomActionsRowCompact: {
    marginTop: spacing.xxs,
  },
  bottomActionsRowVeryCompact: {
    marginTop: 2,
  },
  bottomBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bottomBlockCompact: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  bottomBlockVeryCompact: {
    gap: 3,
    marginTop: 2,
  },
  bottomIconAction: {
    alignItems: 'center',
    borderRadius: radii.md,
    gap: spacing.xxs,
    justifyContent: 'center',
    minWidth: 70,
    opacity: 0.94,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  bottomIconActionCompact: {
    minWidth: 64,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 6,
  },
  bottomIconActionVeryCompact: {
    minWidth: 58,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 4,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 0,
  },
  centerBlockCompact: {
    gap: spacing.xxs,
    justifyContent: 'flex-start',
    paddingTop: spacing.xxs,
  },
  centerBlockVeryCompact: {
    gap: spacing.xxs,
    paddingTop: 0,
  },
  centerFocalStack: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 148,
    justifyContent: 'center',
    position: 'relative',
    width: 148,
  },
  centerFocalStackCompact: {
    height: 130,
    width: 130,
  },
  centerFocalStackVeryCompact: {
    height: 114,
    width: 114,
  },
  centerHaloInner: {
    backgroundColor: roomAtmosphere.collective.auraInner,
    borderRadius: radii.pill,
    height: '72%',
    left: '6%',
    opacity: 0.3,
    position: 'absolute',
    top: '18%',
    transform: [{ scaleX: 1.16 }, { scaleY: 0.82 }, { translateY: 3 }],
    width: '88%',
  },
  centerHaloInnerCompact: {
    height: '68%',
    left: '7%',
    opacity: 0.28,
    top: '20%',
    width: '86%',
  },
  centerHaloInnerVeryCompact: {
    height: '64%',
    left: '8%',
    opacity: 0.26,
    top: '22%',
    width: '84%',
  },
  centerHaloOuter: {
    backgroundColor: roomAtmosphere.collective.auraOuter,
    borderRadius: radii.pill,
    height: '112%',
    left: '-13%',
    opacity: 0.34,
    position: 'absolute',
    top: '-8%',
    transform: [{ scaleX: 1.08 }, { scaleY: 0.88 }],
    width: '126%',
  },
  centerHaloOuterCompact: {
    opacity: 0.3,
  },
  centerHaloOuterVeryCompact: {
    opacity: 0.28,
  },
  collectiveMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    rowGap: spacing.xxs,
  },
  collectiveMetaRowCompact: {
    gap: spacing.xxs,
  },
  collectiveMetaRowVeryCompact: {
    gap: 3,
    rowGap: 2,
  },
  collectiveStatsChip: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  collectiveStatsChipCompact: {
    minHeight: 28,
    paddingHorizontal: spacing.xs,
  },
  collectiveStatsChipVeryCompact: {
    minHeight: 26,
    paddingHorizontal: spacing.xxs,
  },
  container: {
    flex: 1,
    gap: sectionGap,
  },
  containerCompact: {
    gap: spacing.sm,
  },
  containerVeryCompact: {
    gap: spacing.xs,
  },
  dropdownMenu: {
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.md,
    borderWidth: 0.8,
    gap: spacing.xxs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs / 2,
  },
  dropdownOption: {
    borderColor: 'transparent',
    borderRadius: radii.sm,
    borderWidth: 0.7,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  dropdownOptionActive: {
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.transportFill,
    borderWidth: 0.7,
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
    paddingHorizontal: spacing.xs,
  },
  headerBlockCompact: {
    gap: 2,
    paddingHorizontal: spacing.xxs,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconCircleButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  iconCircleButtonCompact: {
    height: 46,
    width: 46,
  },
  iconCircleButtonVeryCompact: {
    height: 42,
    width: 42,
  },
  iconSpacer: {
    width: 52,
  },
  iconSpacerCompact: {
    width: 46,
  },
  iconSpacerVeryCompact: {
    width: 42,
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  inviteButtonCompact: {
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  inviteButtonVeryCompact: {
    minHeight: 36,
  },
  inviteIconCircle: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  inviteIconCircleCompact: {
    height: 22,
    width: 22,
  },
  inviteIconCircleVeryCompact: {
    height: 20,
    width: 20,
  },
  inviteMenu: {
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.md,
    borderWidth: 0.8,
    gap: spacing.xxs,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs / 2,
  },
  inviteOption: {
    borderColor: 'transparent',
    borderRadius: radii.sm,
    borderWidth: 0.7,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  inviteText: {
    fontSize: 13,
    lineHeight: 16,
    textTransform: 'none',
  },
  liveChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 0.7,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  liveChipCompact: {
    minHeight: 30,
    paddingHorizontal: spacing.xs,
  },
  liveChipVeryCompact: {
    minHeight: 28,
    paddingHorizontal: spacing.xxs,
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
  reminderToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 30,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  reminderToggleActive: {
    backgroundColor: roomAtmosphere.collective.liveChipBackground,
    borderColor: roomAtmosphere.collective.liveChipBorder,
  },
  reminderToggleText: {
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
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.panelBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  playButtonCoreCompact: {
    height: 74,
    width: 74,
  },
  playButtonCoreVeryCompact: {
    height: 64,
    width: 64,
  },
  playPulseTap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: {
    transform: [{ scale: 0.98 }],
  },
  prayerTitle: {
    lineHeight: 31,
    maxWidth: '94%',
    textAlign: 'center',
  },
  prayerTitleCompact: {
    lineHeight: 28,
  },
  prayerTitleVeryCompact: {
    lineHeight: 25,
    maxWidth: '96%',
  },
  progressFill: {
    backgroundColor: roomAtmosphere.collective.transportFill,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelsCompact: {
    marginTop: 1,
  },
  progressTrack: {
    backgroundColor: roomAtmosphere.collective.transportTrack,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 14,
    overflow: 'hidden',
  },
  progressTrackCompact: {
    height: 12,
  },
  progressTrackVeryCompact: {
    height: 10,
  },
  screenContent: {
    flex: 1,
  },
  scriptPanelCard: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: radii.xl,
    borderWidth: 0,
    minHeight: 148,
    overflow: 'hidden',
    width: '100%',
  },
  scriptPanelCardCompact: {
    minHeight: 128,
  },
  scriptPanelCardVeryCompact: {
    minHeight: 114,
  },
  scriptSyncWrap: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
    maxHeight: 126,
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
  },
  scriptSyncWrapCompact: {
    maxHeight: 110,
  },
  scriptSyncWrapVeryCompact: {
    maxHeight: 94,
  },
  scriptTextActive: {
    fontSize: 17,
    lineHeight: 25,
    maxWidth: '98%',
    textAlign: 'center',
  },
  scriptTextActiveCompact: {
    fontSize: 16,
    lineHeight: 23,
  },
  scriptTextActiveVeryCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  scriptWord: {
    color: roomAtmosphere.collective.scriptWord,
    fontSize: 17,
    letterSpacing: 0.1,
    lineHeight: 25,
    marginRight: 2,
  },
  scriptWordCompact: {
    fontSize: 16,
    lineHeight: 23,
  },
  scriptWordVeryCompact: {
    fontSize: 14,
    lineHeight: 20,
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
    maxHeight: 132,
    maxWidth: '98%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  scriptWordFlowCompact: {
    maxHeight: 114,
  },
  scriptWordFlowVeryCompact: {
    maxHeight: 98,
  },
  scriptWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 0,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xxs,
    width: '100%',
  },
  scriptWrapCompact: {
    paddingBottom: 2,
    paddingTop: 2,
  },
  scriptWrapVeryCompact: {
    paddingBottom: 2,
    paddingTop: 2,
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  selectorButtonCompact: {
    minHeight: 36,
    paddingHorizontal: spacing.xxs,
  },
  selectorButtonVeryCompact: {
    minHeight: 34,
    paddingHorizontal: 6,
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
    marginTop: spacing.sm,
  },
  selectorRowCompact: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  selectorRowVeryCompact: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  selectorValue: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 17,
    textTransform: 'none',
  },
  selectorValueCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  selectorValueVeryCompact: {
    fontSize: 13,
    lineHeight: 15,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActionsRowCompact: {
    marginBottom: spacing.xxs,
  },
  topActionsRowVeryCompact: {
    marginBottom: 1,
  },
  voiceAvatar: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.collective.panelBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  voiceAvatarCompact: {
    height: 20,
    width: 20,
  },
  voiceAvatarVeryCompact: {
    height: 18,
    width: 18,
  },
  waitingStateBody: {
    maxWidth: '100%',
  },
  waitingStateCard: {
    backgroundColor: roomAtmosphere.collective.selectorBackground,
    borderColor: roomAtmosphere.collective.selectorBorder,
    borderRadius: radii.lg,
    borderWidth: 0.7,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
