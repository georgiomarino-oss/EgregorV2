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
  fetchEvents,
  incrementEventLibraryStart,
  type AppEvent,
  type EventLibraryItem,
} from '../lib/api/data';
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

function FilterChip({
  active,
  fill = false,
  label,
  onPress,
  size = 'md',
}: {
  active: boolean;
  fill?: boolean;
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
      <Typography
        allowFontScaling={false}
        color={active ? figmaV2Reference.text.activeTab : colors.textLabel}
        style={styles.chipText}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
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

  useEffect(() => {
    void loadEvents();
    void loadLibrary();
  }, [loadEvents, loadLibrary]);

  const visibleEvents = useMemo(() => events.slice(0, 2), [events]);
  const primaryEventId = visibleEvents[0]?.id;

  const favoriteCount = favoriteIds.filter((id) => libraryItems.some((item) => item.id === id)).length;
  const recentCount = libraryItems.length;

  const visibleLibrary = useMemo(() => {
    if (libraryMode === 'favorites') {
      return libraryItems.filter((item) => favoriteIds.includes(item.id));
    }

    return libraryItems;
  }, [favoriteIds, libraryItems, libraryMode]);

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

  const toggleFavorite = (itemId: string) => {
    setFavoriteIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  };

  const onOpenEventTemplate = (item: EventLibraryItem) => {
    void incrementEventLibraryStart(item.id).catch(() => {
      // Non-blocking engagement metric update.
    });

    navigation.navigate('EventDetails', { eventTemplateId: item.id });
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
        <Button loading={refreshing} onPress={() => void loadEvents(true)} title="Refresh events" variant="secondary" />
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
            No event templates in this filter
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            Save templates to favorites or choose another category.
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
                  const isFavorite = favoriteIds.includes(item.id);
                  const category = normalizeCategory(item.category);

                  return (
                    <Pressable key={item.id} onPress={() => onOpenEventTemplate(item)} style={({ pressed }) => [pressed && styles.prayerCardPressed]}>
                      <SurfaceCard
                        contentPadding={spacing.sm}
                        radius="md"
                        style={[styles.prayerCard, { width: eventCardWidth }]}
                        variant="homeStatSmall"
                      >
                        <View style={styles.prayerCardHeader}>
                          <Typography allowFontScaling={false} style={styles.prayerTitle} variant="H2" weight="bold">
                            {item.title}
                          </Typography>
                          <Pressable
                            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            onPress={(event) => {
                              event.stopPropagation();
                              toggleFavorite(item.id);
                            }}
                            style={({ pressed }) => [
                              styles.favoriteButton,
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
                        </View>

                        <Typography allowFontScaling={false} color={colors.textSecondary} style={styles.prayerBody}>
                          {item.body}
                        </Typography>
                        <Typography allowFontScaling={false} color={colors.accentSkyStart} variant="Body" weight="bold">
                          {`${item.durationMinutes} min - ${category}`}
                        </Typography>
                        <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
                          {`${item.startsCount} starts`}
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
                      <View key={`${section.category}-${item.id}-dot`} style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
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
  favoriteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.xs,
    width: 36,
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
    minHeight: 208,
  },
  prayerCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
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
  topFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
