import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { requireNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';

const AUDIO_STATUS_UPDATE_INTERVAL_MS = 250;

let configureAudioPromise: Promise<void> | null = null;

export interface AudioPlaybackStatus {
  didJustFinish: boolean;
  durationMillis: number;
  isBuffering: boolean;
  isLoaded: boolean;
  playing: boolean;
  positionMillis: number;
}

export interface ManagedAudioPlayer {
  dispose: () => void;
  getStatus: () => AudioPlaybackStatus;
  pause: () => void;
  play: () => void;
  seekTo: (positionMillis: number) => Promise<void>;
  stop: () => Promise<void>;
  subscribe: (listener: (status: AudioPlaybackStatus) => void) => () => void;
}

const defaultPlaybackStatus: AudioPlaybackStatus = {
  didJustFinish: false,
  durationMillis: 0,
  isBuffering: false,
  isLoaded: false,
  playing: false,
  positionMillis: 0,
};

function mapStatus(status: AudioStatus | null | undefined): AudioPlaybackStatus {
  if (!status) {
    return defaultPlaybackStatus;
  }

  return {
    didJustFinish: Boolean(status.didJustFinish),
    durationMillis: Math.max(0, Math.round(status.duration * 1000)),
    isBuffering: Boolean(status.isBuffering),
    isLoaded: Boolean(status.isLoaded),
    playing: Boolean(status.playing),
    positionMillis: Math.max(0, Math.round(status.currentTime * 1000)),
  };
}

function normalizeSource(source: AudioSource | string | number): AudioSource {
  if (typeof source === 'string') {
    return { uri: source };
  }

  return source;
}

type CompatAudioPlayer = {
  addListener: (eventName: string, listener: (status: AudioStatus) => void) => EventSubscription;
  currentStatus: AudioStatus | null;
  pause: () => void;
  play: () => void;
  remove: () => void;
  seekTo: (seconds: number) => Promise<void>;
};

type ExpoAudioNativeModule = {
  AudioPlayer: new (
    source: AudioSource,
    updateInterval: number,
    keepAudioSessionActive: boolean,
  ) => CompatAudioPlayer;
};

function isCreateAudioPlayerArityError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes('received 4 arguments') &&
    normalizedMessage.includes('3 was expected')
  );
}

function createAudioPlayerCompat(source: AudioSource): CompatAudioPlayer {
  try {
    return createAudioPlayer(source, {
      updateInterval: AUDIO_STATUS_UPDATE_INTERVAL_MS,
    }) as CompatAudioPlayer;
  } catch (error) {
    if (!isCreateAudioPlayerArityError(error)) {
      throw error;
    }

    const audioModule = requireNativeModule('ExpoAudio') as ExpoAudioNativeModule;
    return new audioModule.AudioPlayer(source, AUDIO_STATUS_UPDATE_INTERVAL_MS, false);
  }
}

export async function configureAudioForPlayback() {
  if (!configureAudioPromise) {
    configureAudioPromise = setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      configureAudioPromise = null;
      throw error;
    });
  }

  await configureAudioPromise;
}

export function createPlayer(sourceUriOrAsset: AudioSource | string | number): ManagedAudioPlayer {
  const player = createAudioPlayerCompat(normalizeSource(sourceUriOrAsset));

  let status = mapStatus(player.currentStatus);
  let subscription: EventSubscription | null = null;
  const listeners = new Set<(nextStatus: AudioPlaybackStatus) => void>();

  const publishStatus = (nextStatus: AudioPlaybackStatus) => {
    status = nextStatus;
    listeners.forEach((listener) => listener(nextStatus));
  };

  subscription = player.addListener('playbackStatusUpdate', (nextStatus) => {
    publishStatus(mapStatus(nextStatus));
  });

  return {
    dispose() {
      subscription?.remove();
      subscription = null;
      listeners.clear();
      player.remove();
    },
    getStatus() {
      return status;
    },
    pause() {
      player.pause();
    },
    play() {
      player.play();
    },
    async seekTo(positionMillis: number) {
      const seconds = Math.max(0, positionMillis) / 1000;
      await player.seekTo(seconds);
      publishStatus(mapStatus(player.currentStatus));
    },
    async stop() {
      player.pause();
      await player.seekTo(0);
      publishStatus(mapStatus(player.currentStatus));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(status);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
