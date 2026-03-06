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

      const audioResponse = await generatePrayerAudio({
        allowGeneration: allowAudioGeneration,
        durationMinutes,
        language,
        ...(prayerLibraryItemId ? { prayerLibraryItemId } : {}),
        script: nextScript,
        ...(title?.trim() ? { title: title.trim() } : {}),
        voiceId,
      });

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
