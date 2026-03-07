import { useCallback, useEffect, useRef, useState } from 'react';

import {
  generatePrayerAudio,
  hasPrayerAudioCached,
  type TimedWord,
} from '../../../lib/api/functions';
import {
  configureAudioForPlayback,
  createPlayer,
  type ManagedAudioPlayer,
} from '../../../lib/audio';
import { normalizeTimedWords } from '../utils/timedWords';

interface UseRoomAudioPlayerInput {
  activeAudioKey: string;
  allowAudioGeneration: boolean;
  durationMinutes: number;
  language?: string;
  prayerLibraryItemId?: string;
  scriptText: string;
  title?: string;
  voiceId: string;
}

type MutedUpdater = boolean | ((current: boolean) => boolean);

function toAudioPlaybackSafeMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Audio is unavailable right now.';
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('quota_exceeded') ||
    normalized.includes('credits remaining') ||
    normalized.includes('credits')
  ) {
    return 'Audio generation is temporarily unavailable. Continue with the guided text.';
  }

  if (normalized.includes('no pre-generated audio artifact')) {
    return 'Audio is not ready for this room yet. Continue with the guided text.';
  }

  if (
    normalized.includes('schema cache') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist')
  ) {
    return 'Audio services are temporarily unavailable. Please try again shortly.';
  }

  if (normalized.includes('empty payload')) {
    return 'Audio is unavailable for this session right now.';
  }

  return 'Audio is unavailable right now. Continue with the guided text.';
}

export function useRoomAudioPlayer({
  activeAudioKey,
  allowAudioGeneration,
  durationMinutes,
  language = 'en',
  prayerLibraryItemId,
  scriptText,
  title,
  voiceId,
}: UseRoomAudioPlayerInput) {
  const [isMuted, setIsMutedState] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [timedWords, setTimedWords] = useState<TimedWord[]>([]);
  const [positionMillis, setPositionMillis] = useState(0);

  const activePlayerRef = useRef<ManagedAudioPlayer | null>(null);
  const activePlayerKeyRef = useRef<string | null>(null);
  const activePlayerUnsubscribeRef = useRef<(() => void) | null>(null);

  const disposeActivePlayer = useCallback(() => {
    activePlayerRef.current?.pause();
    activePlayerUnsubscribeRef.current?.();
    activePlayerUnsubscribeRef.current = null;
    activePlayerRef.current?.dispose();
    activePlayerRef.current = null;
    activePlayerKeyRef.current = null;
  }, []);

  const setMuted = useCallback((nextMuted: MutedUpdater) => {
    setIsMutedState((current) => {
      const resolved = typeof nextMuted === 'function' ? nextMuted(current) : nextMuted;
      activePlayerRef.current?.setMuted(resolved);
      return resolved;
    });
  }, []);

  const ensureAudioPlayer = useCallback(async () => {
    const nextScript = scriptText.trim();
    if (!nextScript) {
      throw new Error('No script available.');
    }

    if (activePlayerRef.current && activePlayerKeyRef.current === activeAudioKey) {
      activePlayerRef.current.setMuted(isMuted);
      return activePlayerRef.current;
    }

    const shouldShowAudioLoader = !hasPrayerAudioCached({
      script: nextScript,
      voiceId,
    });
    if (shouldShowAudioLoader) {
      setLoadingAudio(true);
    }

    try {
      await configureAudioForPlayback();

      let audioResponse: Awaited<ReturnType<typeof generatePrayerAudio>>;
      try {
        audioResponse = await generatePrayerAudio({
          allowGeneration: allowAudioGeneration,
          durationMinutes,
          language,
          ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
          script: nextScript,
          ...(title?.trim() ? { title: title.trim() } : {}),
          voiceId,
        });
      } catch (error) {
        const safeMessage = toAudioPlaybackSafeMessage(error);
        if (__DEV__) {
          const rawMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'Unknown audio generation failure.';
          console.warn('[Egregor][AudioPlayback]', safeMessage, rawMessage);
        }
        throw new Error(safeMessage);
      }

      const audioUrl = audioResponse?.audioUrl?.trim();
      const audioBase64 = audioResponse?.audioBase64?.trim();
      const contentType = audioResponse?.contentType?.trim() || 'audio/mpeg';
      const nextTimedWords = normalizeTimedWords(audioResponse?.wordTimings);

      if (!audioUrl && !audioBase64) {
        throw new Error('Audio generation returned an empty payload.');
      }

      const sourceUri = audioUrl || `data:${contentType};base64,${audioBase64}`;
      setTimedWords(nextTimedWords);

      disposeActivePlayer();

      const player = createPlayer(sourceUri);
      player.setMuted(isMuted);

      activePlayerUnsubscribeRef.current = player.subscribe((status) => {
        setPositionMillis(Math.max(0, status.positionMillis));
        if (status.didJustFinish) {
          setIsRunning(false);
        }
      });

      activePlayerRef.current = player;
      activePlayerKeyRef.current = activeAudioKey;

      return player;
    } finally {
      if (shouldShowAudioLoader) {
        setLoadingAudio(false);
      }
    }
  }, [
    activeAudioKey,
    allowAudioGeneration,
    disposeActivePlayer,
    durationMinutes,
    isMuted,
    language,
    prayerLibraryItemId,
    scriptText,
    title,
    voiceId,
  ]);

  const play = useCallback(async () => {
    const player = await ensureAudioPlayer();
    player.play();
    setIsRunning(true);
  }, [ensureAudioPlayer]);

  const pause = useCallback(() => {
    activePlayerRef.current?.pause();
    setIsRunning(false);
  }, []);

  const seekTo = useCallback(
    async (nextPositionMillis: number) => {
      const player = await ensureAudioPlayer();
      await player.seekTo(nextPositionMillis);
    },
    [ensureAudioPlayer],
  );

  const stop = useCallback(async () => {
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
    setPositionMillis(0);
  }, []);

  useEffect(() => {
    setPositionMillis(0);
    setTimedWords([]);
    setIsRunning(false);
    disposeActivePlayer();
  }, [activeAudioKey, disposeActivePlayer]);

  useEffect(() => {
    return () => {
      disposeActivePlayer();
    };
  }, [disposeActivePlayer]);

  return {
    ensureAudioPlayer,
    isMuted,
    isRunning,
    loadingAudio,
    pause,
    play,
    positionMillis,
    seekTo,
    setMuted,
    stop,
    timedWords,
  };
}
