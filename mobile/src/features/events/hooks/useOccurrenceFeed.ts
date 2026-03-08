import { useMemo } from 'react';

import type { CanonicalEventOccurrence } from '../../../lib/api/data';
import type { OccurrenceSection, ScheduledEventOccurrence } from '../types';
import { buildLiveFeedSections } from '../services/liveModel';

interface UseOccurrenceFeedInput {
  nowTick: number;
  occurrences: CanonicalEventOccurrence[];
  subscribedAll: boolean;
  subscribedKeys: string[];
}

interface UseOccurrenceFeedResult {
  allScheduledEvents: ScheduledEventOccurrence[];
  liveNowCount: number;
  next24HoursCount: number;
  savedCount: number;
  sections: OccurrenceSection[];
}

export function useOccurrenceFeed({
  nowTick,
  occurrences,
  subscribedAll,
  subscribedKeys,
}: UseOccurrenceFeedInput): UseOccurrenceFeedResult {
  return useMemo(() => {
    const { allItems, sections } = buildLiveFeedSections({
      nowMillis: nowTick,
      occurrences,
      subscribedAll,
      subscribedKeys,
    });
    const next24Section =
      sections.find((section) => section.key === 'next_24_hours')?.items.length ?? 0;

    return {
      allScheduledEvents: allItems,
      liveNowCount: allItems.filter((item) => item.status === 'live').length,
      next24HoursCount: next24Section,
      savedCount: allItems.filter((item) => {
        if (subscribedAll) {
          return true;
        }
        const key = item.subscriptionKey?.trim() || '';
        return key.length > 0 && subscribedKeys.includes(key);
      }).length,
      sections,
    };
  }, [nowTick, occurrences, subscribedAll, subscribedKeys]);
}
