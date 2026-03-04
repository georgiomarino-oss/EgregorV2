import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchEventLibraryItems,
  fetchEventNotificationState,
  fetchEvents,
  fetchNewsDrivenEvents,
  setAllEventNotifications,
  setEventNotificationSubscription,
  type AppEvent,
  type EventLibraryItem,
  type NewsDrivenEventItem,
} from '../lib/api/data';
import { generateNewsDrivenEvents } from '../lib/api/functions';
import { supabase } from '../lib/supabase';
import {
  EVENTS_PANEL_HEIGHT,
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SCREEN_PAD_X,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { CARD_PADDING_LG } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;
type LibraryMode = 'favorites' | 'recent' | null;
type CategoryFilter = 'All' | string | null;
type EventStatusChip = 'live' | 'soon' | 'upcoming';

type ScheduledEventOccurrence = {
  body: string;
  category: string;
  durationMinutes: number;
  favoriteKey: string;
  occurrenceKey: string;
  script: string;
  source: 'news' | 'template';
  startsAt: string;
  startsCount: number;
  status: EventStatusChip;
  title: string;
};

const HORIZON_DAYS = 7;
const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;
const SCHEDULE_HOURS_LOCAL = [0, 3, 6, 9, 12, 15, 18, 21];

function normalizeCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value && value.length > 0 ? value : 'Manifestation';
}

function formatEventSubtitle(event: AppEvent) {
  if (event.status === 'live') {
    return `${event.participants} active now`;
  }

  const startsAt = new Date(event.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return event.subtitle?.trim() || 'Scheduled event';
  }

  const hoursUntil = Math.max(0, Math.floor((startsAt.getTime() - Date.now()) / 3600000));
  if (hoursUntil < 1) {
    return 'Starting soon';
  }

  if (hoursUntil < 24) {
    return `Starts in ${hoursUntil}h`;
  }

  const days = Math.floor(hoursUntil / 24);
  return `Starts in ${days}d`;
}

function toOccurrenceStatus(startIso: string, durationMinutes: number, nowMillis: number): EventStatusChip {
  const startMillis = new Date(startIso).getTime();
  const endMillis = startMillis + durationMinutes * 60 * 1000;

  if (nowMillis >= startMillis && nowMillis < endMillis) {
    return 'live';
  }

  if (startMillis > nowMillis && startMillis - nowMillis <= SOON_WINDOW_MS) {
    return 'soon';
  }

  return 'upcoming';
}

function formatOccurrenceStartLabel(startIso: string) {
  const date = new Date(startIso);
  if (Number.isNaN(date.getTime())) {
    return 'Upcoming';
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function buildTemplateScheduleSlots(nowDate: Date) {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const slots: Date[] = [];

  const startOfToday = new Date(nowDate);
  startOfToday.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < HORIZON_DAYS; dayOffset += 1) {
    for (const hour of SCHEDULE_HOURS_LOCAL) {
      const startAt = new Date(startOfToday);
      startAt.setDate(startOfToday.getDate() + dayOffset);
      startAt.setHours(hour, 0, 0, 0);

      const endAt = new Date(startAt.getTime() + 15 * 60 * 1000);
      if (endAt.getTime() <= nowMillis) {
        continue;
      }

      if (startAt.getTime() > horizonMillis) {
        continue;
      }

      slots.push(startAt);
    }
  }

  return slots;
}

function buildScheduledTemplateEvents(items: EventLibraryItem[], nowDate: Date): ScheduledEventOccurrence[] {
  const slots = buildTemplateScheduleSlots(nowDate);
  if (slots.length === 0 || items.length === 0) {
    return [];
  }

  const sortedItems = items.slice().sort((left, right) => left.title.localeCompare(right.title));
  const maxCount = Math.min(sortedItems.length, slots.length);
  const nowMillis = nowDate.getTime();

  return Array.from({ length: maxCount }).map((_, index) => {
    const item = sortedItems[index];
    const slot = slots[index];
    const startsAt = (slot ?? new Date(nowDate.getTime() + index * 60 * 60 * 1000)).toISOString();
    const status = toOccurrenceStatus(startsAt, item?.durationMinutes ?? 10, nowMillis);

    return {
      body: item?.body ?? '',
      category: normalizeCategory(item?.category),
      durationMinutes: item?.durationMinutes ?? 10,
      favoriteKey: item?.id ?? `template-${index}`,
      occurrenceKey: `template:${item?.id}:${startsAt}`,
      script: item?.script ?? item?.body ?? '',
      source: 'template',
      startsAt,
      startsCount: item?.startsCount ?? 0,
      status,
      title: item?.title ?? 'Manifestation Event',
    } satisfies ScheduledEventOccurrence;
  });
}

function buildScheduledNewsEvents(items: NewsDrivenEventItem[], nowDate: Date): ScheduledEventOccurrence[] {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;

  return items
    .filter((item) => {
      const startMillis = new Date(item.startsAt).getTime();
      if (!Number.isFinite(startMillis)) {
        return false;
      }
      const endMillis = startMillis + item.durationMinutes * 60 * 1000;
      return endMillis > nowMillis && startMillis <= horizonMillis;
    })
    .map((item) => {
      return {
        body: item.summary,
        category: `News - ${normalizeCategory(item.category)}`,
        durationMinutes: item.durationMinutes,
        favoriteKey: item.id,
        occurrenceKey: `news:${item.id}:${item.startsAt}`,
        script: item.script,
        source: 'news',
        startsAt: item.startsAt,
        startsCount: 0,
        status: toOccurrenceStatus(item.startsAt, item.durationMinutes, nowMillis),
        title: item.title,
      } satisfies ScheduledEventOccurrence;
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function FilterChip({
  active,
  fill = false,
  icon,
  label,
  onPress,
  size = 'md',
}: {
  active: boolean;
  fill?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'md' | 'sm';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chipBase,
        size === 'sm' ? styles.chipSm : styles.chipMd,
        fill && styles.chipFill,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.chipContentRow}>
        {icon ? (
          <MaterialCommunityIcons
            color={active ? figmaV2Reference.text.activeTab : colors.textLabel}
            name={icon}
            size={14}
          />
        ) : null}
        <Typography
          allowFontScaling={false}
          color={active ? figmaV2Reference.text.activeTab : colors.textLabel}
          style={styles.chipText}
          variant="Caption"
          weight="bold"
        >
          {label}
        </Typography>
      </View>
    </Pressable>
  );
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const { width: windowWidth } = useWindowDimensions();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libraryItems, setLibraryItems] = useState<EventLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<LibraryMode>('recent');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeSlideByCategory, setActiveSlideByCategory] = useState<Partial<Record<string, number>>>({});
  const [libraryRailWidth, setLibraryRailWidth] = useState<number | null>(null);

  const [newsItems, setNewsItems] = useState<NewsDrivenEventItem[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [subscribedAll, setSubscribedAll] = useState(false);
  const [subscribedKeys, setSubscribedKeys] = useState<string[]>([]);
  const [updatingSubscriptionKey, setUpdatingSubscriptionKey] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  const loadEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await fetchEvents(8);
      setEvents(nextEvents);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);

    try {
      const nextLibraryItems = await fetchEventLibraryItems(80);
      setLibraryItems(nextLibraryItems);
      setLibraryError(null);
    } catch (nextError) {
      setLibraryError(nextError instanceof Error ? nextError.message : 'Failed to load event library.');
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const syncNewsEvents = useCallback(async () => {
    try {
      await generateNewsDrivenEvents();
      const nextNewsItems = await fetchNewsDrivenEvents(80);
      setNewsItems(nextNewsItems);
    } catch {

      try {
        const fallbackNewsItems = await fetchNewsDrivenEvents(80);
        setNewsItems(fallbackNewsItems);
      } catch {
        // Ignore secondary failure.
      }
    }
  }, []);

  const loadNotificationState = useCallback(async (nextUserId: string) => {
    try {
      const state = await fetchEventNotificationState(nextUserId);
      setSubscribedAll(state.subscribedAll);
      setSubscribedKeys(state.subscriptionKeys);
    } catch {
      setSubscribedAll(false);
      setSubscribedKeys([]);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
    void loadLibrary();
    void syncNewsEvents();
  }, [loadEvents, loadLibrary, syncNewsEvents]);

  useEffect(() => {
    let active = true;

    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();
      const nextUserId = data.user?.id ?? null;
      if (!active) {
        return;
      }

      setUserId(nextUserId);
      if (nextUserId) {
        await loadNotificationState(nextUserId);
      }
    };

    void hydrateUser();

    return () => {
      active = false;
    };
  }, [loadNotificationState]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const visibleEvents = useMemo(() => events.slice(0, 2), [events]);
  const primaryEventId = visibleEvents[0]?.id;

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

  const favoriteCount = favoriteIds.filter((id) =>
    allScheduledEvents.some((item) => item.favoriteKey === id),
  ).length;
  const recentCount = allScheduledEvents.length;

  const visibleLibrary = useMemo(() => {
    if (libraryMode === 'favorites') {
      return allScheduledEvents.filter((item) => favoriteIds.includes(item.favoriteKey));
    }

    return allScheduledEvents;
  }, [allScheduledEvents, favoriteIds, libraryMode]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(visibleLibrary.map((item) => normalizeCategory(item.category)))).sort(
      (left, right) => left.localeCompare(right),
    );
  }, [visibleLibrary]);

  const categoryFilters = useMemo(() => ['All', ...availableCategories], [availableCategories]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'All' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
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

  const fallbackEventCardWidth = useMemo(() => {
    const laneWidth = windowWidth - SCREEN_PAD_X * 2 - CARD_PADDING_LG * 2 - 2;
    return Math.max(200, laneWidth);
  }, [windowWidth]);

  const eventCardWidth =
    libraryRailWidth && libraryRailWidth > 0 ? libraryRailWidth : fallbackEventCardWidth;

  const eventCardStep = useMemo(() => eventCardWidth + HOME_CARD_GAP, [eventCardWidth]);

  const toggleFavorite = (favoriteKey: string) => {
    setFavoriteIds((current) => {
      if (current.includes(favoriteKey)) {
        return current.filter((id) => id !== favoriteKey);
      }

      return [...current, favoriteKey];
    });
  };

  const onOpenOccurrence = (occurrence: ScheduledEventOccurrence) => {
    const params: EventsStackParamList['EventRoom'] = {
      durationMinutes: occurrence.durationMinutes,
      eventSource: occurrence.source,
      eventTitle: occurrence.title,
      occurrenceKey: occurrence.occurrenceKey,
      scheduledStartAt: occurrence.startsAt,
      scriptText: occurrence.script,
      ...(occurrence.source === 'template' ? { eventTemplateId: occurrence.favoriteKey } : {}),
    };

    navigation.navigate('EventRoom', params);
  };

  const toggleSubscribeAll = async () => {
    if (!userId) {
      setError('Sign in to subscribe for event notifications.');
      return;
    }

    setUpdatingSubscriptionKey('all');
    try {
      const nextValue = !subscribedAll;
      await setAllEventNotifications(userId, nextValue);
      setSubscribedAll(nextValue);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update subscriptions.');
    } finally {
      setUpdatingSubscriptionKey(null);
    }
  };

  const toggleOccurrenceSubscription = async (occurrenceKey: string) => {
    if (!userId) {
      setError('Sign in to subscribe for event notifications.');
      return;
    }

    setUpdatingSubscriptionKey(occurrenceKey);
    try {
      if (subscribedAll) {
        await setAllEventNotifications(userId, false);
        await setEventNotificationSubscription({
          enabled: true,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedAll(false);
        setSubscribedKeys([occurrenceKey]);
      } else if (subscribedKeys.includes(occurrenceKey)) {
        await setEventNotificationSubscription({
          enabled: false,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedKeys((current) => current.filter((value) => value !== occurrenceKey));
      } else {
        await setEventNotificationSubscription({
          enabled: true,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedKeys((current) => [...current, occurrenceKey]);
      }

      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update subscriptions.');
    } finally {
      setUpdatingSubscriptionKey(null);
    }
  };

  const statusChipStyle = (status: EventStatusChip) => {
    if (status === 'live') {
      return styles.statusChipLive;
    }
    if (status === 'soon') {
      return styles.statusChipSoon;
    }
    return styles.statusChipUpcoming;
  };

  const statusLabel = (status: EventStatusChip) => {
    if (status === 'live') {
      return 'Live';
    }
    if (status === 'soon') {
      return 'Soon';
    }
    return 'Upcoming';
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="events">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Earth in prayer
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Join active circles and upcoming events from around the world.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={[styles.section, styles.mainPanel]} variant="eventsPanel">
        <View style={styles.globeWrap}>
          <LottieView autoPlay loop source={globeFallbackAnimation} style={styles.globeAnimation} />
        </View>

        {loading && events.length === 0 ? <ActivityIndicator color={colors.accentMintStart} /> : null}

        {error ? (
          <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              Could not load event stream
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              {error}
            </Typography>
          </SurfaceCard>
        ) : null}

        {!loading && visibleEvents.length === 0 ? (
          <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              No live or scheduled events yet
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              Create an event in Supabase to populate this feed.
            </Typography>
          </SurfaceCard>
        ) : (
          visibleEvents.map((event) => (
            <SurfaceCard key={event.id} radius="sm" style={styles.feedCard} variant="homeAlert">
              <Typography allowFontScaling={false} variant="H2" weight="bold">
                {event.title}
              </Typography>
              <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
                {formatEventSubtitle(event)}
              </Typography>
            </SurfaceCard>
          ))
        )}

        <Button
          disabled={!primaryEventId}
          onPress={() => {
            if (primaryEventId) {
              navigation.navigate('EventDetails', { eventId: primaryEventId });
              return;
            }
            navigation.navigate('EventDetails');
          }}
          title="Open map event timeline"
          variant="primary"
        />
        <Button
          loading={refreshing}
          onPress={() => {
            void Promise.all([loadEvents(true), syncNewsEvents()]);
          }}
          title="Refresh events"
          variant="secondary"
        />
      </SurfaceCard>

      <View style={styles.topFilterRow}>
        <FilterChip
          active={libraryMode === 'favorites'}
          fill
          label={`Favorites (${favoriteCount})`}
          onPress={() => setLibraryMode((current) => (current === 'favorites' ? null : 'favorites'))}
        />
        <FilterChip
          active={libraryMode === 'recent'}
          fill
          label={`Recent (${recentCount})`}
          onPress={() => setLibraryMode((current) => (current === 'recent' ? null : 'recent'))}
        />
        <FilterChip
          active={subscribedAll}
          icon={subscribedAll ? 'bell-ring' : 'bell-outline'}
          label="All alerts"
          onPress={() => {
            void toggleSubscribeAll();
          }}
        />
      </View>

      <ScrollView horizontal contentContainerStyle={styles.categoryRail} showsHorizontalScrollIndicator={false}>
        {categoryFilters.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategory === category}
            label={category}
            onPress={() => setSelectedCategory((current) => (current === category ? null : category))}
            size="sm"
          />
        ))}
      </ScrollView>

      {libraryLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentMintStart} />
        </View>
      ) : null}

      {libraryError ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            Could not load event templates
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            {libraryError}
          </Typography>
          <Button onPress={() => void loadLibrary()} title="Retry" variant="secondary" />
        </SurfaceCard>
      ) : null}

      {!libraryLoading && !libraryError && sections.length === 0 ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            No events in this filter
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            Try another category or switch filters.
          </Typography>
        </SurfaceCard>
      ) : null}

      {!libraryLoading && !libraryError
        ? sections.map((section) => (
            <SurfaceCard key={section.category} radius="xl" style={styles.categorySection}>
              <View style={styles.sectionHeaderRow}>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {section.category}
                </Typography>
                <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body" weight="bold">
                  {`${section.items.length} events`}
                </Typography>
              </View>

              <ScrollView
                horizontal
                decelerationRate="fast"
                onLayout={(event) => {
                  const measuredWidth = event.nativeEvent.layout.width;
                  if (
                    measuredWidth > 0 &&
                    (libraryRailWidth === null || Math.abs(libraryRailWidth - measuredWidth) > 1)
                  ) {
                    setLibraryRailWidth(measuredWidth);
                  }
                }}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / eventCardStep);
                  const clampedIndex = Math.max(0, Math.min(section.items.length - 1, nextIndex));
                  setActiveSlideByCategory((current) => ({
                    ...current,
                    [section.category]: clampedIndex,
                  }));
                }}
                snapToAlignment="start"
                snapToInterval={eventCardStep}
                contentContainerStyle={styles.prayerRail}
                showsHorizontalScrollIndicator={false}
              >
                {section.items.map((item) => {
                  const isFavorite = favoriteIds.includes(item.favoriteKey);
                  const isSubscribed = subscribedAll || subscribedKeys.includes(item.occurrenceKey);
                  const isUpdatingBell = updatingSubscriptionKey === item.occurrenceKey;
                  const status = statusLabel(item.status);
                  const statusStyle = statusChipStyle(item.status);

                  return (
                    <Pressable key={item.occurrenceKey} onPress={() => onOpenOccurrence(item)} style={({ pressed }) => [pressed && styles.prayerCardPressed]}>
                      <SurfaceCard
                        contentPadding={spacing.sm}
                        radius="md"
                        style={[styles.prayerCard, { width: eventCardWidth }]}
                        variant="homeStatSmall"
                      >
                        <View style={styles.prayerCardHeader}>
                          <View style={styles.cardTitleWrap}>
                            <Typography allowFontScaling={false} numberOfLines={2} style={styles.prayerTitle} variant="H2" weight="bold">
                              {item.title}
                            </Typography>
                            <View style={[styles.statusChip, statusStyle]}>
                              <Typography allowFontScaling={false} color={colors.textOnSky} style={styles.statusChipText} variant="Caption" weight="bold">
                                {status}
                              </Typography>
                            </View>
                          </View>
                          <View style={styles.cardActionRow}>
                            <Pressable
                              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                              onPress={(event) => {
                                event.stopPropagation();
                                toggleFavorite(item.favoriteKey);
                              }}
                              style={({ pressed }) => [
                                styles.actionButton,
                                isFavorite && styles.favoriteButtonActive,
                                pressed && styles.favoritePressed,
                              ]}
                            >
                              <MaterialCommunityIcons
                                color={isFavorite ? colors.textOnSky : colors.textSecondary}
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={18}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={isSubscribed ? 'Disable event alerts' : 'Enable event alerts'}
                              onPress={(event) => {
                                event.stopPropagation();
                                void toggleOccurrenceSubscription(item.occurrenceKey);
                              }}
                              style={({ pressed }) => [
                                styles.actionButton,
                                isSubscribed && styles.subscriptionButtonActive,
                                pressed && styles.favoritePressed,
                              ]}
                            >
                              <MaterialCommunityIcons
                                color={isSubscribed ? colors.textOnSky : colors.textSecondary}
                                name={isUpdatingBell ? 'bell-ring-outline' : isSubscribed ? 'bell-ring' : 'bell-outline'}
                                size={18}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <Typography allowFontScaling={false} color={colors.textSecondary} style={styles.prayerBody}>
                          {item.body}
                        </Typography>
                        <Typography allowFontScaling={false} color={colors.accentSkyStart} variant="Body" weight="bold">
                          {`${item.durationMinutes} min - ${item.category}`}
                        </Typography>
                        <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
                          {formatOccurrenceStartLabel(item.startsAt)}
                        </Typography>
                      </SurfaceCard>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {section.items.length > 1 ? (
                <View style={styles.dotRow}>
                  {section.items.map((item, index) => {
                    const isActive = (activeSlideByCategory[section.category] ?? 0) === index;

                    return (
                      <View key={`${section.category}-${item.occurrenceKey}-dot`} style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
                    );
                  })}
                </View>
              ) : null}
            </SurfaceCard>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  categoryRail: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  categorySection: {
    gap: spacing.sm,
  },
  chipBase: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  chipContentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  chipFill: {
    flex: 1,
    minWidth: 0,
  },
  chipMd: {
    minHeight: 34,
  },
  chipSm: {
    minHeight: 30,
    minWidth: 60,
  },
  chipActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderMedium,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    lineHeight: 14,
    textTransform: 'none',
  },
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  dot: {
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.accentSkyStart,
    borderColor: colors.accentSkyStart,
  },
  dotInactive: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderMedium,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
  },
  emptyStateCard: {
    gap: spacing.xs,
    minHeight: 148,
  },
  favoriteButtonActive: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
  },
  favoritePressed: {
    transform: [{ scale: 0.97 }],
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  globeAnimation: {
    height: 232,
    width: '100%',
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 232,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mainPanel: {
    minHeight: EVENTS_PANEL_HEIGHT,
  },
  prayerBody: {
    minHeight: 68,
  },
  prayerCard: {
    gap: spacing.xs,
    minHeight: 220,
  },
  prayerCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  prayerCardPressed: {
    transform: [{ scale: 0.995 }],
  },
  prayerRail: {
    gap: HOME_CARD_GAP,
    paddingRight: 0,
  },
  prayerTitle: {
    flex: 1,
  },
  section: {
    gap: HOME_CARD_GAP,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusChipLive: {
    backgroundColor: colors.live,
    borderColor: colors.live,
  },
  statusChipSoon: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statusChipText: {
    textTransform: 'uppercase',
  },
  statusChipUpcoming: {
    backgroundColor: colors.accentSkyStart,
    borderColor: colors.accentSkyStart,
  },
  subscriptionButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  topFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
