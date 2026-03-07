import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import {
  createSharedSoloSession,
  endSharedSoloSession,
  fetchPrayerCircleMembers,
  fetchPrayerScriptVariantByTitle,
  findReusableSharedSoloSession,
  fetchSharedSoloSessionSnapshot,
  fetchUserPreferences,
  getCachedPrayerCircleMembers,
  joinSharedSoloSession,
  leaveSharedSoloSession,
  prefetchPrayerScriptVariantByTitle,
  refreshSharedSoloSessionPresence,
  recordSoloSession,
  subscribeSharedSoloSession,
  updateSharedSoloSessionHostState,
  type SharedSoloSessionPlaybackState,
  type SharedSoloSession,
  type SharedSoloSessionParticipant,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { buildSoloInviteMessage, buildSoloInviteUrl, buildSoloShareMessage } from '../lib/invite';
import { supabase } from '../lib/supabase';
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
const SHARED_SOLO_HOST_SYNC_INTERVAL_MS = 2_000;
const SHARED_SOLO_PARTICIPANT_SYNC_THRESHOLD_MS = 1_250;
const SHARED_SOLO_PRESENCE_HEARTBEAT_MS = 20_000;
const SHARED_SOLO_SNAPSHOT_REFRESH_MS = 30_000;
const SHARED_SOLO_JOIN_NOTICE_MS = 4_000;
const ELEVENLABS_VOICE_ID_BY_LABEL: Partial<Record<(typeof VOICE_OPTIONS)[number], string>> = {
  Oliver: 'jfIS2w2yJi0grJZPyEsk',
  Amaya: 'BFvr34n3gOoz0BAf9Rwn',
  Rainbird: 'bgU7lBMo69PNEOWHFqxM',
  Dominic: 'V904i8ujLitGpMyoTznT',
};
const VOICE_LABEL_BY_ELEVENLABS_ID = Object.entries(ELEVENLABS_VOICE_ID_BY_LABEL).reduce(
  (accumulator, [label, voiceId]) => {
    if (!voiceId) {
      return accumulator;
    }

    accumulator[voiceId] = label as (typeof VOICE_OPTIONS)[number];
    return accumulator;
  },
  {} as Record<string, (typeof VOICE_OPTIONS)[number]>,
);

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

function toSoloLiveSafeErrorMessage(error: unknown, fallback: string) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  const normalized = rawMessage.toLowerCase();

  let safeMessage = fallback;

  if (
    normalized.includes('schema cache') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist')
  ) {
    safeMessage = 'Shared sessions are temporarily unavailable. Please try again shortly.';
  } else if (
    normalized.includes('permission') ||
    normalized.includes('forbidden') ||
    normalized.includes('not allowed')
  ) {
    safeMessage = 'You do not have access to this shared session.';
  } else if (
    normalized.includes('not found') &&
    (normalized.includes('session') || normalized.includes('shared'))
  ) {
    safeMessage = 'This shared session is no longer available.';
  } else if (
    normalized.includes('invalid') &&
    (normalized.includes('session') || normalized.includes('shared'))
  ) {
    safeMessage = 'This shared session link is invalid.';
  } else if (
    normalized.includes('quota_exceeded') ||
    normalized.includes('credits remaining') ||
    normalized.includes('credits')
  ) {
    safeMessage = 'Audio generation is temporarily unavailable. Continue with the guided text.';
  }

  if (__DEV__ && safeMessage !== rawMessage) {
    console.warn('[Egregor][SoloLive]', safeMessage, rawMessage);
  }

  return safeMessage;
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
  const [sessionUserId, setSessionUserId] = useState('');
  const [activeSharedSessionId, setActiveSharedSessionId] = useState(
    route.params?.sharedSessionId?.trim() || '',
  );
  const [sharedSession, setSharedSession] = useState<SharedSoloSession | null>(null);
  const [sharedParticipants, setSharedParticipants] = useState<SharedSoloSessionParticipant[]>([]);
  const [sharedJoinNotice, setSharedJoinNotice] = useState<string | null>(null);
  const scriptTextRef = useRef(scriptText);
  const sessionUserIdRef = useRef<string | null>(null);
  const recordedSessionAudioKeyRef = useRef<string | null>(null);
  const sharedPresenceJoinedRef = useRef(false);
  const sharedPresenceLeftRef = useRef(false);
  const sharedPlaybackNoticeShownRef = useRef(false);
  const sharedStartedAtRef = useRef<string | null>(null);
  const sharedHostSyncAtRef = useRef(0);
  const sharedJoinedCountRef = useRef(0);
  const sharedUnsubscribeRef = useRef<(() => void) | null>(null);
  const sharedJoinNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSharedSessionPromiseRef = useRef<Promise<string> | null>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
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
  const isVeryCompactHeight = viewportHeight <= 700;
  const isCompactHeight = viewportHeight <= 780;
  const isNarrowWidth = viewportWidth <= 360;
  const useCompactLayout = isCompactHeight || isNarrowWidth;
  const sharedSessionId = activeSharedSessionId.trim();
  const isSharedSessionActive = sharedSessionId.length > 0;
  const isSharedHost = Boolean(
    sharedSession && sessionUserId && sharedSession.hostUserId === sessionUserId,
  );
  const isSharedParticipant = Boolean(isSharedSessionActive && sharedSession && !isSharedHost);
  const captureSharedRole = route.params?.captureSharedRole;
  const isSharedParticipantVisual = isSharedParticipant || captureSharedRole === 'participant';
  const isSharedHostVisual = isSharedHost || captureSharedRole === 'host';
  const soloFieldMode: 'host' | 'participant' | 'solo' = isSharedParticipantVisual
    ? 'participant'
    : isSharedHostVisual
      ? 'host'
      : 'solo';
  const sharedJoinedCount = sharedParticipants.length;
  const modeBadgeLabel = isSharedParticipantVisual
    ? 'Participant sync'
    : isSharedHostVisual
      ? 'Host lead'
      : 'Personal sanctuary';
  const modeBadgeDetail = isSharedParticipantVisual
    ? `Tethered to host cadence - ${Math.max(sharedJoinedCount, 2)} joined`
    : isSharedHostVisual
      ? `Guiding shared session - ${Math.max(sharedJoinedCount, 2)} joined`
      : 'Center and begin your own ritual';

  const {
    ensureAudioPlayer,
    isMuted,
    isRunning,
    loadingAudio,
    pause,
    play,
    positionMillis: elapsedMillis,
    seekTo,
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

  const resolveSessionUserId = useCallback(async () => {
    let userId = sessionUserIdRef.current;
    if (userId) {
      return userId;
    }

    const { data, error: userError } = await supabase.auth.getUser();
    userId = userError ? null : (data.user?.id?.trim() ?? null);
    sessionUserIdRef.current = userId;
    if (userId) {
      setSessionUserId(userId);
    }

    return userId;
  }, []);

  const recordSessionIfNeeded = useCallback(async () => {
    if (recordedSessionAudioKeyRef.current === activeAudioKey) {
      return;
    }

    const durationSeconds = Math.max(0, Math.floor(elapsedMillis / 1000));
    if (durationSeconds < MIN_RECORDABLE_SESSION_SECONDS) {
      return;
    }

    const userId = await resolveSessionUserId();

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
  }, [
    activeAudioKey,
    activePrayerTitle,
    elapsedMillis,
    resolveSessionUserId,
    resolvedScriptText,
    totalSeconds,
  ]);

  const refreshSharedSnapshot = useCallback(
    async (nextSessionId?: string) => {
      const targetSessionId = (nextSessionId ?? sharedSessionId).trim();
      if (!targetSessionId) {
        return null;
      }

      const userId = await resolveSessionUserId();
      if (!userId) {
        return null;
      }

      const snapshot = await fetchSharedSoloSessionSnapshot(targetSessionId, userId);
      setActiveSharedSessionId(snapshot.session.id);
      setSharedSession(snapshot.session);
      setSharedParticipants(snapshot.participants);
      sharedStartedAtRef.current = snapshot.session.startedAt;

      const syncedScript = snapshot.session.scriptText.trim();
      if (syncedScript && syncedScript !== scriptTextRef.current.trim()) {
        setScriptText(syncedScript);
      }

      if (
        MINUTE_OPTIONS.includes(snapshot.session.durationMinutes as (typeof MINUTE_OPTIONS)[number])
      ) {
        setSelectedMinutes(snapshot.session.durationMinutes as (typeof MINUTE_OPTIONS)[number]);
      }

      const syncedVoice = VOICE_LABEL_BY_ELEVENLABS_ID[snapshot.session.voiceId];
      if (syncedVoice) {
        setSelectedVoice(syncedVoice);
      }

      const previousCount = sharedJoinedCountRef.current;
      sharedJoinedCountRef.current = snapshot.joinedCount;
      const isHostSnapshot = snapshot.session.hostUserId === userId;
      if (isHostSnapshot && previousCount > 0 && snapshot.joinedCount > previousCount) {
        setSharedJoinNotice(
          snapshot.joinedCount > 2
            ? 'More people joined your prayer.'
            : 'Someone joined your prayer.',
        );

        if (sharedJoinNoticeTimeoutRef.current) {
          clearTimeout(sharedJoinNoticeTimeoutRef.current);
        }
        sharedJoinNoticeTimeoutRef.current = setTimeout(() => {
          setSharedJoinNotice(null);
          sharedJoinNoticeTimeoutRef.current = null;
        }, SHARED_SOLO_JOIN_NOTICE_MS);
      }

      return snapshot;
    },
    [resolveSessionUserId, sharedSessionId],
  );

  const leaveSharedPresence = useCallback(async () => {
    if (!sharedSessionId || sharedPresenceLeftRef.current || !sharedPresenceJoinedRef.current) {
      return;
    }

    const userId = await resolveSessionUserId();
    if (!userId) {
      return;
    }

    sharedPresenceLeftRef.current = true;
    try {
      await leaveSharedSoloSession(sharedSessionId, userId);
    } catch {
      // Shared session leave is best-effort on screen exit.
    }
  }, [resolveSessionUserId, sharedSessionId]);

  const onExitSession = useCallback(() => {
    closeAllSelectors();

    void (async () => {
      try {
        await recordSessionIfNeeded();
      } catch {
        // Non-blocking; session recording should not block room exit.
      }
      if (sharedSessionId && isSharedHost) {
        try {
          const userId = await resolveSessionUserId();
          if (userId) {
            await endSharedSoloSession(sharedSessionId, userId);
            setSharedSession((current) =>
              current
                ? {
                    ...current,
                    endedAt: new Date().toISOString(),
                    playbackState: 'ended',
                    status: 'ended',
                  }
                : current,
            );
          }
        } catch {
          // Ending a shared session is best-effort.
        }
      }
      await leaveSharedPresence();
      await stop();
      navigation.goBack();
    })();
  }, [
    closeAllSelectors,
    isSharedHost,
    leaveSharedPresence,
    navigation,
    recordSessionIfNeeded,
    resolveSessionUserId,
    sharedSessionId,
    stop,
  ]);

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
      setError(
        toSoloLiveSafeErrorMessage(nextError, 'Unable to load this prayer script right now.'),
      );
    } finally {
      setLoadingScript(false);
    }
  }, [fallbackScript, prayerLibraryItemId, scriptLookupTitle, selectedMinutes]);

  useEffect(() => {
    scriptTextRef.current = scriptText;
  }, [scriptText]);

  useEffect(() => {
    const routeSessionId = route.params?.sharedSessionId?.trim() || '';
    if (!routeSessionId || routeSessionId === sharedSessionId) {
      return;
    }

    setActiveSharedSessionId(routeSessionId);
  }, [route.params?.sharedSessionId, sharedSessionId]);

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
        setSessionUserId(data.user.id);
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
    if (!sharedSessionId) {
      setSharedSession(null);
      setSharedParticipants([]);
      sharedJoinedCountRef.current = 0;
      sharedPresenceJoinedRef.current = false;
      sharedPresenceLeftRef.current = false;
      sharedPlaybackNoticeShownRef.current = false;
      sharedStartedAtRef.current = null;
      sharedHostSyncAtRef.current = 0;
      if (sharedUnsubscribeRef.current) {
        sharedUnsubscribeRef.current();
        sharedUnsubscribeRef.current = null;
      }
      return;
    }

    let active = true;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const refreshSharedState = () => {
      void refreshSharedSnapshot(sharedSessionId).catch(() => {
        // Shared session realtime refresh is best-effort.
      });
    };

    const bootstrapSharedSession = async () => {
      const userId = await resolveSessionUserId();
      if (!active || !userId) {
        return;
      }

      try {
        await joinSharedSoloSession({
          sessionId: sharedSessionId,
          userId,
        });
        sharedPresenceJoinedRef.current = true;
        sharedPresenceLeftRef.current = false;

        const snapshot = await refreshSharedSnapshot(sharedSessionId);
        if (!active || !snapshot) {
          return;
        }
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(
          toSoloLiveSafeErrorMessage(
            nextError,
            'Could not join this shared prayer session right now.',
          ),
        );
        return;
      }

      refreshSharedState();

      if (sharedUnsubscribeRef.current) {
        sharedUnsubscribeRef.current();
      }
      sharedUnsubscribeRef.current = subscribeSharedSoloSession({
        onParticipantsChange: refreshSharedState,
        onSessionChange: refreshSharedState,
        sessionId: sharedSessionId,
      });

      heartbeat = setInterval(() => {
        void refreshSharedSnapshot(sharedSessionId).catch(() => {
          // Shared snapshot refresh is best-effort.
        });
        void refreshSharedSoloSessionPresence(sharedSessionId, userId).catch(() => {
          // Presence heartbeat is best-effort.
        });
      }, SHARED_SOLO_PRESENCE_HEARTBEAT_MS);

      void refreshSharedSoloSessionPresence(sharedSessionId, userId).catch(() => {
        // Presence bootstrap is best-effort.
      });
    };

    void bootstrapSharedSession();

    const snapshotInterval = setInterval(() => {
      refreshSharedState();
    }, SHARED_SOLO_SNAPSHOT_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(snapshotInterval);
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (sharedUnsubscribeRef.current) {
        sharedUnsubscribeRef.current();
        sharedUnsubscribeRef.current = null;
      }
      void leaveSharedPresence();
    };
  }, [leaveSharedPresence, refreshSharedSnapshot, resolveSessionUserId, sharedSessionId]);

  useEffect(() => {
    return () => {
      if (sharedJoinNoticeTimeoutRef.current) {
        clearTimeout(sharedJoinNoticeTimeoutRef.current);
      }
    };
  }, []);

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
      if (sharedSessionId && isSharedHost) {
        try {
          const userId = await resolveSessionUserId();
          if (userId) {
            await endSharedSoloSession(sharedSessionId, userId);
            setSharedSession((current) =>
              current
                ? {
                    ...current,
                    endedAt: new Date().toISOString(),
                    playbackState: 'ended',
                    status: 'ended',
                  }
                : current,
            );
          }
        } catch {
          // Ending a shared session is best-effort.
        }
      }
      await stop();
    })();
  }, [
    elapsedMillis,
    isSharedHost,
    recordSessionIfNeeded,
    resolveSessionUserId,
    sharedSessionId,
    stop,
    totalMillis,
  ]);

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

  useEffect(() => {
    if (!sharedSessionId) {
      return;
    }

    if (route.params?.sharedSessionId?.trim() === sharedSessionId) {
      return;
    }

    navigation.setParams({
      ...(route.params ?? {}),
      sharedSessionId,
    });
  }, [navigation, route.params, sharedSessionId]);

  const publishSharedHostState = useCallback(
    async (force = false) => {
      if (!sharedSessionId || !isSharedHost) {
        return;
      }
      if (sharedSession?.status === 'ended') {
        return;
      }

      const userId = await resolveSessionUserId();
      if (!userId) {
        return;
      }

      const nowMs = Date.now();
      if (!force && nowMs - sharedHostSyncAtRef.current < SHARED_SOLO_HOST_SYNC_INTERVAL_MS) {
        return;
      }

      let playbackState: SharedSoloSessionPlaybackState = 'idle';
      if (elapsedMillis >= totalMillis) {
        playbackState = 'ended';
      } else if (isRunning) {
        playbackState = 'playing';
      } else if (elapsedMillis > 0) {
        playbackState = 'paused';
      }

      let startedAt = sharedStartedAtRef.current;
      if (!startedAt && (playbackState === 'playing' || playbackState === 'paused')) {
        startedAt = new Date(nowMs - elapsedMillis).toISOString();
      }

      const status = playbackState === 'ended' ? 'ended' : 'active';
      await updateSharedSoloSessionHostState({
        ...(playbackState === 'ended' ? { endedAt: new Date().toISOString() } : {}),
        hostUserId: userId,
        playbackPositionMs: playbackState === 'ended' ? totalMillis : elapsedMillis,
        playbackState,
        sessionId: sharedSessionId,
        ...(startedAt ? { startedAt } : {}),
        status,
      });

      sharedHostSyncAtRef.current = nowMs;
      if (startedAt) {
        sharedStartedAtRef.current = startedAt;
      }
    },
    [
      elapsedMillis,
      isRunning,
      isSharedHost,
      resolveSessionUserId,
      sharedSession?.status,
      sharedSessionId,
      totalMillis,
    ],
  );

  useEffect(() => {
    if (!sharedSessionId || !isSharedHost) {
      return;
    }

    void publishSharedHostState(true).catch(() => {
      // Host sync push is best-effort and should not block playback.
    });
  }, [isRunning, isSharedHost, publishSharedHostState, sharedSessionId]);

  useEffect(() => {
    if (!sharedSessionId || !isSharedHost) {
      return;
    }

    void publishSharedHostState(false).catch(() => {
      // Host sync updates are best-effort.
    });
  }, [elapsedMillis, isSharedHost, publishSharedHostState, sharedSessionId]);

  useEffect(() => {
    if (!sharedSessionId) {
      return;
    }

    let active = true;
    const refreshOnResume = async () => {
      const userId = await resolveSessionUserId();
      if (!active || !userId) {
        return;
      }

      await joinSharedSoloSession({
        sessionId: sharedSessionId,
        userId,
      }).catch(() => {
        // Resume join is best-effort.
      });
      if (!active) {
        return;
      }

      await refreshSharedSoloSessionPresence(sharedSessionId, userId).catch(() => {
        // Presence refresh on resume is best-effort.
      });

      await refreshSharedSnapshot(sharedSessionId).catch(() => {
        // Snapshot refresh on resume is best-effort.
      });

      if (isSharedHost) {
        await publishSharedHostState(true).catch(() => {
          // Host state publish on resume is best-effort.
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }
      void refreshOnResume();
    });

    return () => {
      active = false;
      appStateSubscription.remove();
    };
  }, [
    isSharedHost,
    publishSharedHostState,
    refreshSharedSnapshot,
    resolveSessionUserId,
    sharedSessionId,
  ]);

  useEffect(() => {
    if (!isSharedParticipant || !sharedSession) {
      sharedPlaybackNoticeShownRef.current = false;
      return;
    }

    let cancelled = false;

    const syncToHostState = async () => {
      if (!sharedSession || cancelled) {
        return;
      }

      if (sharedSession.status === 'ended' || sharedSession.playbackState === 'ended') {
        await stop();
        return;
      }

      if (!resolvedScriptText.trim()) {
        return;
      }

      const hostPosition = Math.max(0, sharedSession.playbackPositionMs);
      await ensureAudioPlayer();

      if (cancelled) {
        return;
      }

      if (Math.abs(elapsedMillis - hostPosition) > SHARED_SOLO_PARTICIPANT_SYNC_THRESHOLD_MS) {
        await seekTo(hostPosition);
      }

      if (sharedSession.playbackState === 'playing') {
        if (!isRunning) {
          await play();
        }
      } else if (isRunning) {
        pause();
      }

      if (!sharedPlaybackNoticeShownRef.current) {
        sharedPlaybackNoticeShownRef.current = true;
        setSharedJoinNotice('Synced with shared prayer.');
        if (sharedJoinNoticeTimeoutRef.current) {
          clearTimeout(sharedJoinNoticeTimeoutRef.current);
        }
        sharedJoinNoticeTimeoutRef.current = setTimeout(() => {
          setSharedJoinNotice(null);
          sharedJoinNoticeTimeoutRef.current = null;
        }, SHARED_SOLO_JOIN_NOTICE_MS);
      }
    };

    void syncToHostState().catch(() => {
      // Participant sync is best-effort.
    });

    return () => {
      cancelled = true;
    };
  }, [
    elapsedMillis,
    ensureAudioPlayer,
    isRunning,
    isSharedParticipant,
    pause,
    play,
    resolvedScriptText,
    seekTo,
    sharedSession,
    stop,
  ]);

  const onTogglePlayback = useCallback(async () => {
    closeAllSelectors();

    if (isSharedParticipant) {
      if (!sharedPlaybackNoticeShownRef.current) {
        sharedPlaybackNoticeShownRef.current = true;
        Alert.alert(
          'Shared prayer sync',
          'Playback is controlled by the host while this shared prayer is active.',
        );
      }
      return;
    }

    if (isRunning) {
      pause();
      return;
    }

    try {
      await play();
      setError(null);
    } catch (nextError) {
      setError(
        toSoloLiveSafeErrorMessage(nextError, 'Unable to start audio for this prayer right now.'),
      );
    }
  }, [closeAllSelectors, isRunning, isSharedParticipant, pause, play]);

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

  const centerOrbStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: scriptFocus.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
        transform: [
          {
            scale: scriptFocus.interpolate({
              inputRange: [0, 1],
              outputRange: [
                1,
                isSharedHostVisual
                  ? 1 + motion.amplitude.pronounced
                  : isSharedParticipantVisual
                    ? 1 + motion.amplitude.subtle
                    : 1 + motion.amplitude.medium,
              ],
            }),
          },
        ],
      };

  const ensureSharedSessionForInvite = useCallback(async () => {
    if (sharedSessionId) {
      return sharedSessionId;
    }

    if (pendingSharedSessionPromiseRef.current) {
      return pendingSharedSessionPromiseRef.current;
    }

    const createPromise = (async () => {
      const userId = await resolveSessionUserId();
      if (!userId) {
        throw new Error('Sign in to share this prayer session.');
      }

      const nextScript = resolvedScriptText.trim();
      if (!nextScript) {
        throw new Error('Please wait for the prayer script to finish loading before sharing.');
      }

      const reusableSession = await findReusableSharedSoloSession({
        durationMinutes: selectedMinutes,
        hostUserId: userId,
        intention: activePrayerTitle,
        ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
        scriptText: nextScript,
        voiceId: activeVoiceId,
      });

      if (reusableSession) {
        await joinSharedSoloSession({
          sessionId: reusableSession.id,
          userId,
        });

        setActiveSharedSessionId(reusableSession.id);
        setSharedSession(reusableSession);
        setSharedParticipants([
          {
            isActive: true,
            joinedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            role: 'host',
            sessionId: reusableSession.id,
            userId,
          },
        ]);
        sharedJoinedCountRef.current = Math.max(sharedJoinedCountRef.current, 1);
        sharedPresenceJoinedRef.current = true;
        sharedPresenceLeftRef.current = false;
        sharedStartedAtRef.current = reusableSession.startedAt;
        void refreshSharedSnapshot(reusableSession.id).catch(() => {
          // Shared snapshot refresh is best-effort.
        });
        return reusableSession.id;
      }

      const nextSession = await createSharedSoloSession({
        durationMinutes: selectedMinutes,
        hostUserId: userId,
        intention: activePrayerTitle,
        ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
        scriptText: nextScript,
        voiceId: activeVoiceId,
      });

      setActiveSharedSessionId(nextSession.id);
      setSharedSession(nextSession);
      setSharedParticipants([
        {
          isActive: true,
          joinedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          role: 'host',
          sessionId: nextSession.id,
          userId,
        },
      ]);
      sharedJoinedCountRef.current = 1;
      sharedPresenceJoinedRef.current = true;
      sharedPresenceLeftRef.current = false;
      sharedStartedAtRef.current = nextSession.startedAt;

      return nextSession.id;
    })();

    pendingSharedSessionPromiseRef.current = createPromise;
    try {
      return await createPromise;
    } finally {
      pendingSharedSessionPromiseRef.current = null;
    }
  }, [
    activePrayerTitle,
    activeVoiceId,
    refreshSharedSnapshot,
    prayerLibraryItemId,
    resolveSessionUserId,
    resolvedScriptText,
    selectedMinutes,
    sharedSessionId,
  ]);

  const resolvePrayerCircleMembers = useCallback(async () => {
    const cachedMembers = getCachedPrayerCircleMembers();
    if (cachedMembers) {
      return cachedMembers;
    }

    try {
      return await fetchPrayerCircleMembers();
    } catch {
      return [];
    }
  }, []);

  const onSelectInviteOption = useCallback(
    (option: string) => {
      setIsInviteOpen(false);

      const normalizedOption = option.trim().toLowerCase();
      void (async () => {
        try {
          const inviteSessionId = await ensureSharedSessionForInvite();
          const inviteContext = {
            durationMinutes: selectedMinutes,
            intention: activePrayerTitle,
            ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
            sharedSessionId: inviteSessionId,
          };

          if (normalizedOption === 'copy invite link') {
            await Clipboard.setStringAsync(buildSoloInviteUrl(inviteContext));
            Alert.alert(
              'Invite link copied',
              'The solo prayer invite link is now on your clipboard.',
            );
            return;
          }

          const message =
            normalizedOption === 'invite your circle'
              ? buildSoloInviteMessage({
                  ...inviteContext,
                  members: await resolvePrayerCircleMembers(),
                })
              : buildSoloShareMessage(inviteContext);

          await Share.share({
            message,
            title: 'Invite to Solo Prayer',
          });
        } catch (nextError) {
          const detail = toSoloLiveSafeErrorMessage(
            nextError,
            'Unable to share the invite right now.',
          );
          Alert.alert('Invite failed', detail);
        }
      })();
    },
    [
      activePrayerTitle,
      ensureSharedSessionForInvite,
      prayerLibraryItemId,
      resolvePrayerCircleMembers,
      selectedMinutes,
    ],
  );

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
        style={[
          styles.container,
          useCompactLayout && styles.containerCompact,
          isVeryCompactHeight && styles.containerVeryCompact,
        ]}
      >
        <SoloAuraField active={isRunning} mode={soloFieldMode} />

        <View
          style={[
            styles.topActionsRow,
            useCompactLayout && styles.topActionsRowCompact,
            isVeryCompactHeight && styles.topActionsRowVeryCompact,
          ]}
        >
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            hitSlop={6}
            onPress={() => setIsFavorite((current) => !current)}
            style={({ pressed }) => [
              styles.iconCircleButton,
              useCompactLayout && styles.iconCircleButtonCompact,
              isVeryCompactHeight && styles.iconCircleButtonVeryCompact,
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
              style={styles.prayerTitle}
              variant="H1"
              weight="bold"
            >
              {activePrayerTitle}
            </Typography>
            <View style={styles.soloSubtitleRow}>
              <LiveLogo context="solo" size={14} />
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                style={styles.soloSubtitle}
                variant="Caption"
              >
                Personal Sanctuary
              </Typography>
            </View>
            <View
              style={[
                styles.modeBadge,
                isSharedHostVisual
                  ? styles.modeBadgeHost
                  : isSharedParticipantVisual
                    ? styles.modeBadgeParticipant
                    : styles.modeBadgeSolo,
              ]}
            >
              <Typography
                allowFontScaling={false}
                color={colors.textPrimary}
                variant="Caption"
                weight="bold"
              >
                {modeBadgeLabel}
              </Typography>
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                style={styles.modeBadgeDetail}
                variant="Caption"
              >
                {modeBadgeDetail}
              </Typography>
            </View>
            {isSharedSessionActive || isSharedParticipantVisual || isSharedHostVisual ? (
              <View style={styles.sharedSessionRow}>
                <LiveLogo context={isSharedHostVisual ? 'solo' : 'eventRoom'} size={12} />
                <Typography
                  allowFontScaling={false}
                  color={colors.textSecondary}
                  style={styles.sharedSessionText}
                  variant="Caption"
                  weight="bold"
                >
                  {isSharedHostVisual
                    ? `Shared prayer - ${Math.max(sharedJoinedCount, 2)} joined`
                    : `Synced with host - ${Math.max(sharedJoinedCount, 2)} joined`}
                </Typography>
              </View>
            ) : null}
            {sharedJoinNotice ? (
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                style={styles.sharedJoinNotice}
                variant="Caption"
              >
                {sharedJoinNotice}
              </Typography>
            ) : null}
          </View>

          <View
            style={[
              styles.selectorRow,
              useCompactLayout && styles.selectorRowCompact,
              isVeryCompactHeight && styles.selectorRowVeryCompact,
            ]}
          >
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
                            isSelected ? roomAtmosphere.solo.transportFill : colors.textPrimary
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
                  useCompactLayout && styles.selectorButtonCompact,
                  isVeryCompactHeight && styles.selectorButtonVeryCompact,
                  !reduceMotionEnabled && pressed && styles.selectorPressed,
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
                  {`${selectedMinutes} min`}
                </Typography>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name={isMinuteMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                />
              </Pressable>

              {isMinuteMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {MINUTE_OPTIONS.map((minutes) => {
                    const isSelected = selectedMinutes === minutes;
                    return (
                      <Pressable
                        accessibilityLabel={`${minutes} minutes`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={minutes}
                        onPress={(event) => {
                          event.stopPropagation();
                          setSelectedMinutes(minutes);
                          setIsMinuteMenuOpen(false);
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
                            isSelected ? roomAtmosphere.solo.transportFill : colors.textPrimary
                          }
                          variant="Body"
                          weight="bold"
                        >
                          {`${minutes} min`}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
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
            accessibilityHint="Starts or pauses guided prayer audio."
            accessibilityLabel={isRunning ? 'Pause prayer audio' : 'Play prayer audio'}
            accessibilityRole="button"
            accessibilityState={{
              busy: loadingAudio,
              disabled: loadingAudio || !resolvedScriptText.trim() || isSharedParticipant,
              selected: isRunning,
            }}
            disabled={loadingAudio || !resolvedScriptText.trim() || isSharedParticipant}
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
              {isSharedHostVisual ? (
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.hostLeadRing}
                />
              ) : null}
              {isSharedParticipantVisual ? (
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.participantTether}
                >
                  <View style={styles.participantNode} />
                  <View style={styles.participantLine} />
                  <View style={styles.participantNode} />
                </View>
              ) : null}
              <View
                style={[
                  styles.playButtonCore,
                  useCompactLayout && styles.playButtonCoreCompact,
                  isVeryCompactHeight && styles.playButtonCoreVeryCompact,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    isSharedParticipantVisual
                      ? colors.accentSkyStart
                      : roomAtmosphere.solo.transportFill
                  }
                  name={
                    isSharedParticipantVisual
                      ? 'access-point-network'
                      : isRunning
                        ? 'pause'
                        : 'play'
                  }
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
                loading={loadingScript && !resolvedScriptText.trim()}
                loadingMessage="Loading prayer script..."
                maxScriptLines={MAX_SCRIPT_LINES}
                noScriptMessage="No script available for this prayer yet."
                scriptSyncWrapStyle={[
                  styles.scriptSyncWrap,
                  useCompactLayout && styles.scriptSyncWrapCompact,
                  isVeryCompactHeight && styles.scriptSyncWrapVeryCompact,
                ]}
                scriptText={resolvedScriptText}
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
              if (isSharedParticipant) {
                Alert.alert(
                  'Shared prayer sync',
                  'Reset is controlled by the host while this shared prayer is active.',
                );
                return;
              }
              void stop();
            }}
            onSelectInviteOption={onSelectInviteOption}
            onToggleInvite={() => setIsInviteOpen((current) => !current)}
            onToggleMute={() => setMuted((current) => !current)}
            progress={progress}
            rightLabel={totalLabel}
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
    opacity: 0.9,
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
    gap: spacing.xs,
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
    height: 142,
    justifyContent: 'center',
    position: 'relative',
    width: 142,
  },
  centerFocalStackCompact: {
    height: 126,
    width: 126,
  },
  centerFocalStackVeryCompact: {
    height: 112,
    width: 112,
  },
  centerHaloInner: {
    backgroundColor: roomAtmosphere.solo.auraInner,
    borderRadius: radii.pill,
    bottom: 19,
    left: 19,
    opacity: 0.44,
    position: 'absolute',
    right: 19,
    top: 19,
  },
  centerHaloInnerCompact: {
    bottom: 16,
    left: 16,
    right: 16,
    top: 16,
  },
  centerHaloInnerVeryCompact: {
    bottom: 14,
    left: 14,
    right: 14,
    top: 14,
  },
  centerHaloOuter: {
    backgroundColor: roomAtmosphere.solo.auraOuter,
    borderRadius: radii.pill,
    bottom: 0,
    left: 0,
    opacity: 0.5,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  centerHaloOuterCompact: {
    opacity: 0.44,
  },
  centerHaloOuterVeryCompact: {
    opacity: 0.4,
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
    backgroundColor: roomAtmosphere.solo.panelBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.transportFill,
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
  },
  headerBlockCompact: {
    gap: 2,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconCircleButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
  inviteButton: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
    backgroundColor: roomAtmosphere.solo.panelBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
    backgroundColor: roomAtmosphere.solo.panelBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
  minutesSelectorButton: {
    justifyContent: 'center',
  },
  modeBadge: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 0.7,
    gap: 1,
    marginTop: spacing.xxs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  modeBadgeDetail: {
    textAlign: 'center',
    textTransform: 'none',
  },
  modeBadgeHost: {
    backgroundColor: 'rgba(73, 53, 31, 0.58)',
    borderColor: colors.accentSoftGoldStart,
  },
  modeBadgeParticipant: {
    backgroundColor: 'rgba(25, 45, 66, 0.6)',
    borderColor: colors.accentSkyStart,
  },
  modeBadgeSolo: {
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
  },
  noMotion: {
    opacity: 1,
  },
  participantLine: {
    backgroundColor: colors.accentSkyStart,
    borderRadius: radii.pill,
    height: 2,
    opacity: 0.58,
    width: 24,
  },
  participantNode: {
    backgroundColor: colors.accentSkyStart,
    borderRadius: radii.pill,
    height: 4,
    opacity: 0.82,
    width: 4,
  },
  participantTether: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    position: 'absolute',
    top: 28,
  },
  playButtonCore: {
    alignItems: 'center',
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
    borderRadius: radii.pill,
    borderWidth: 0.7,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  playButtonCoreCompact: {
    height: 72,
    width: 72,
  },
  playButtonCoreVeryCompact: {
    height: 62,
    width: 62,
  },
  playPulseTap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: {
    transform: [{ scale: 0.98 }],
  },
  prayerTitle: {
    lineHeight: 32,
    maxWidth: '94%',
    textAlign: 'center',
  },
  progressFill: {
    backgroundColor: roomAtmosphere.solo.transportFill,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
    backgroundColor: roomAtmosphere.solo.transportTrack,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
    maxHeight: 124,
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
  },
  scriptSyncWrapCompact: {
    maxHeight: 108,
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
    color: roomAtmosphere.solo.scriptWord,
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
    maxHeight: 130,
    maxWidth: '98%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  scriptWordFlowCompact: {
    maxHeight: 112,
  },
  scriptWordFlowVeryCompact: {
    maxHeight: 96,
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
    backgroundColor: roomAtmosphere.solo.selectorBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
  hostLeadRing: {
    borderColor: colors.accentSoftGoldStart,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: '94%',
    opacity: 0.44,
    position: 'absolute',
    width: '94%',
  },
  sharedJoinNotice: {
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  sharedSessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    marginTop: 2,
  },
  sharedSessionText: {
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  soloSubtitle: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  soloSubtitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
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
    backgroundColor: roomAtmosphere.solo.panelBackground,
    borderColor: roomAtmosphere.solo.selectorBorder,
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
});
