import type { ScheduledEventOccurrence } from '../types';

const FLAGSHIP_SERIES_KEYS = new Set([
  'special-collective-moment',
  'global-peace-circle',
  'global-awakening-meditation',
  'heart-coherence-circle',
  'full-moon-gathering',
  'emergency-global-prayer',
]);
const RITUAL_1111_SERIES_KEY = 'daily-1111-intention-reset';

export type GlobePulseBucket = 'calm' | 'radiant' | 'steady' | 'vivid';
export type GlobePulseState =
  | 'flagship'
  | 'live'
  | 'news'
  | 'ritual_1111'
  | 'upcoming'
  | 'waiting_room';

export interface GlobePulseIntensity {
  activePresenceCount: number;
  bucket: GlobePulseBucket;
  label: string;
  scale: number;
  signal: number;
}

export function isFlagshipSeries(seriesKey: string | null | undefined) {
  const normalized = seriesKey?.trim() ?? '';
  return FLAGSHIP_SERIES_KEYS.has(normalized);
}

export function isRitual1111Series(seriesKey: string | null | undefined) {
  return (seriesKey?.trim() ?? '') === RITUAL_1111_SERIES_KEY;
}

export function resolveGlobePulseState(occurrence: ScheduledEventOccurrence): GlobePulseState {
  if (isRitual1111Series(occurrence.seriesKey)) {
    return 'ritual_1111';
  }

  if (isFlagshipSeries(occurrence.seriesKey)) {
    return 'flagship';
  }

  if (occurrence.status === 'live') {
    return 'live';
  }

  if (occurrence.status === 'waiting_room' || occurrence.status === 'soon') {
    return 'waiting_room';
  }

  if (occurrence.category.toLowerCase().startsWith('news')) {
    return 'news';
  }

  return 'upcoming';
}

export function resolveGlobePulseIntensity(input: {
  activePresenceCount: number;
  occurrence: Pick<ScheduledEventOccurrence, 'startsCount' | 'status'>;
}): GlobePulseIntensity {
  const activePresenceCount = Math.max(0, Math.min(Math.round(input.activePresenceCount), 50));
  const startsCountSignal = Math.max(0, Math.min(Math.round(input.occurrence.startsCount), 50));
  const canonicalSignal = Math.max(activePresenceCount, startsCountSignal);
  const statusBoost =
    input.occurrence.status === 'live'
      ? 2
      : input.occurrence.status === 'waiting_room' || input.occurrence.status === 'soon'
        ? 1
        : 0;
  const signal = Math.max(0, Math.min(canonicalSignal + statusBoost, 18));

  if (signal <= 1) {
    return {
      activePresenceCount,
      bucket: 'calm',
      label: 'Calm',
      scale: 0.88,
      signal,
    };
  }

  if (signal <= 4) {
    return {
      activePresenceCount,
      bucket: 'steady',
      label: 'Steady',
      scale: 1.02,
      signal,
    };
  }

  if (signal <= 8) {
    return {
      activePresenceCount,
      bucket: 'vivid',
      label: 'Vivid',
      scale: 1.16,
      signal,
    };
  }

  return {
    activePresenceCount,
    bucket: 'radiant',
    label: 'Radiant',
    scale: 1.32,
    signal,
  };
}
