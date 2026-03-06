import { useEffect, useMemo, useState } from 'react';

import type { AppEvent, EventLibraryItem, NewsDrivenEventItem } from '../../../lib/api/data';
import { prefetchPrayerAudio } from '../../../lib/api/functions';
import type {
  CategoryFilter,
  EventTimeFilter,
  OccurrenceSection,
  ScheduledEventOccurrence,
} from '../types';
import {
  addLocalDays,
  buildScheduledNewsEvents,
  buildScheduledTemplateEvents,
  normalizeCategory,
} from '../utils/occurrence';
import { startOfLocalDay } from '../utils/occurrence';

interface UseOccurrenceFeedInput {
  events: AppEvent[];
  libraryItems: EventLibraryItem[];
  newsItems: NewsDrivenEventItem[];
  nowTick: number;
}

interface UseOccurrenceFeedResult {
  allScheduledEvents: ScheduledEventOccurrence[];
  categoryFilters: string[];
  liveFilterCount: number;
  sections: OccurrenceSection[];
  selectedCategory: CategoryFilter;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryFilter>>;
  setTimeFilter: React.Dispatch<React.SetStateAction<EventTimeFilter>>;
  timeFilter: EventTimeFilter;
  todayFilterCount: number;
  tomorrowFilterCount: number;
  visibleEvents: AppEvent[];
}

export function useOccurrenceFeed({
  events,
  libraryItems,
  newsItems,
  nowTick,
}: UseOccurrenceFeedInput): UseOccurrenceFeedResult {
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>('today');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => {
          const startsAtMillis = new Date(event.startsAt).getTime();
          if (!Number.isFinite(startsAtMillis)) {
            return false;
          }

          const endsAtMillis = startsAtMillis + Math.max(1, event.durationMinutes) * 60 * 1000;
          return endsAtMillis > nowTick;
        })
        .slice(0, 2),
    [events, nowTick],
  );

  const scheduledTemplateEvents = useMemo(
    () => buildScheduledTemplateEvents(libraryItems, new Date(nowTick)),
    [libraryItems, nowTick],
  );

  const scheduledNewsEvents = useMemo(
    () => buildScheduledNewsEvents(newsItems, new Date(nowTick)),
    [newsItems, nowTick],
  );

  const allScheduledEvents = useMemo(
    () =>
      [...scheduledTemplateEvents, ...scheduledNewsEvents].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
    [scheduledNewsEvents, scheduledTemplateEvents],
  );

  useEffect(() => {
    const uniqueScripts = new Set<string>();

    for (const scheduledEvent of allScheduledEvents) {
      const script = scheduledEvent.script.trim();
      if (!script || uniqueScripts.has(script)) {
        continue;
      }

      uniqueScripts.add(script);
      prefetchPrayerAudio({
        allowGeneration: false,
        durationMinutes: scheduledEvent.durationMinutes,
        language: 'en',
        script,
        title: scheduledEvent.title,
      });

      if (uniqueScripts.size >= 8) {
        break;
      }
    }
  }, [allScheduledEvents]);

  const timeFilterBoundaries = useMemo(() => {
    const nowDate = new Date(nowTick);
    const todayStart = startOfLocalDay(nowDate);
    const tomorrowStart = addLocalDays(todayStart, 1);
    const dayAfterTomorrowStart = addLocalDays(todayStart, 2);

    return {
      dayAfterTomorrowStart,
      todayStart,
      tomorrowStart,
    };
  }, [nowTick]);

  const liveFilterCount = useMemo(
    () => allScheduledEvents.filter((item) => item.status === 'live').length,
    [allScheduledEvents],
  );

  const todayFilterCount = useMemo(
    () =>
      allScheduledEvents.filter((item) => {
        const startsAt = new Date(item.startsAt);
        if (Number.isNaN(startsAt.getTime())) {
          return false;
        }

        return (
          startsAt >= timeFilterBoundaries.todayStart &&
          startsAt < timeFilterBoundaries.tomorrowStart
        );
      }).length,
    [allScheduledEvents, timeFilterBoundaries.todayStart, timeFilterBoundaries.tomorrowStart],
  );

  const tomorrowFilterCount = useMemo(
    () =>
      allScheduledEvents.filter((item) => {
        const startsAt = new Date(item.startsAt);
        if (Number.isNaN(startsAt.getTime())) {
          return false;
        }

        return (
          startsAt >= timeFilterBoundaries.tomorrowStart &&
          startsAt < timeFilterBoundaries.dayAfterTomorrowStart
        );
      }).length,
    [
      allScheduledEvents,
      timeFilterBoundaries.dayAfterTomorrowStart,
      timeFilterBoundaries.tomorrowStart,
    ],
  );

  const visibleLibrary = useMemo(() => {
    if (timeFilter === null) {
      return allScheduledEvents;
    }

    if (timeFilter === 'live') {
      return allScheduledEvents.filter((item) => item.status === 'live');
    }

    if (timeFilter === 'today') {
      return allScheduledEvents.filter((item) => {
        const startsAt = new Date(item.startsAt);
        if (Number.isNaN(startsAt.getTime())) {
          return false;
        }

        return (
          startsAt >= timeFilterBoundaries.todayStart &&
          startsAt < timeFilterBoundaries.tomorrowStart
        );
      });
    }

    return allScheduledEvents.filter((item) => {
      const startsAt = new Date(item.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        return false;
      }

      return (
        startsAt >= timeFilterBoundaries.tomorrowStart &&
        startsAt < timeFilterBoundaries.dayAfterTomorrowStart
      );
    });
  }, [
    allScheduledEvents,
    timeFilter,
    timeFilterBoundaries.dayAfterTomorrowStart,
    timeFilterBoundaries.todayStart,
    timeFilterBoundaries.tomorrowStart,
  ]);

  const availableCategories = useMemo(
    () =>
      Array.from(new Set(visibleLibrary.map((item) => normalizeCategory(item.category)))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [visibleLibrary],
  );

  const categoryFilters = useMemo(() => ['All', ...availableCategories], [availableCategories]);

  useEffect(() => {
    if (
      selectedCategory &&
      selectedCategory !== 'All' &&
      !availableCategories.includes(selectedCategory)
    ) {
      const timeout = setTimeout(() => {
        setSelectedCategory('All');
      }, 0);

      return () => {
        clearTimeout(timeout);
      };
    }

    return undefined;
  }, [availableCategories, selectedCategory]);

  const sections = useMemo(() => {
    const scopedCategories =
      !selectedCategory || selectedCategory === 'All'
        ? availableCategories
        : availableCategories.filter((category) => category === selectedCategory);

    return scopedCategories
      .map((category) => ({
        category,
        items: visibleLibrary.filter((item) => normalizeCategory(item.category) === category),
      }))
      .filter((section) => section.items.length > 0);
  }, [availableCategories, selectedCategory, visibleLibrary]);

  return {
    allScheduledEvents,
    categoryFilters,
    liveFilterCount,
    sections,
    selectedCategory,
    setSelectedCategory,
    setTimeFilter,
    timeFilter,
    todayFilterCount,
    tomorrowFilterCount,
    visibleEvents,
  };
}
