import type { LiveFeedSectionKey } from '../types';

interface OccurrenceVisualState {
  emphasisIcon: 'clock-outline' | 'earth';
  emphasisLabel: string | null;
  fallbackLabel: string | null;
  isElevenEleven: boolean;
  isFlagship: boolean;
}

export function resolveOccurrenceVisualState(
  sectionKey?: LiveFeedSectionKey,
): OccurrenceVisualState {
  const isElevenEleven = sectionKey === 'ritual_1111';
  const isFlagship = sectionKey === 'global_flagships';

  return {
    emphasisIcon: isElevenEleven ? 'clock-outline' : 'earth',
    emphasisLabel: isElevenEleven
      ? '11:11 Signature Ritual'
      : isFlagship
        ? 'Global Flagship'
        : null,
    fallbackLabel: isElevenEleven ? '11:11 Ritual' : isFlagship ? 'Global Flagship' : null,
    isElevenEleven,
    isFlagship,
  };
}

