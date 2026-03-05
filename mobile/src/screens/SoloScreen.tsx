import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchPrayerLibraryItems,
  getCachedPrayerLibraryItems,
  incrementPrayerLibraryStart,
  prefetchPrayerScriptVariantByTitle,
  type PrayerLibraryItem,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { HOME_CARD_GAP, PROFILE_SECTION_GAP, SCREEN_PAD_X } from '../theme/figmaV2Layout';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { CARD_PADDING_LG } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloHome'>;
type LibraryMode = 'favorites' | 'recent' | null;
type CategoryFilter = 'All' | string | null;

function normalizeCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value && value.length > 0 ? value : 'General';
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

export function SoloScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const { width: windowWidth } = useWindowDimensions();
  const initialLibraryItemsRef = useRef<PrayerLibraryItem[]>(getCachedPrayerLibraryItems() ?? []);
  const initialLibraryItems = initialLibraryItemsRef.current;

  const [libraryMode, setLibraryMode] = useState<LibraryMode>('recent');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeSlideByCategory, setActiveSlideByCategory] = useState<
    Partial<Record<string, number>>
  >({});
  const [prayerRailWidth, setPrayerRailWidth] = useState<number | null>(null);
  const [libraryItems, setLibraryItems] = useState<PrayerLibraryItem[]>(initialLibraryItems);
  const [loading, setLoading] = useState(initialLibraryItems.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLibrary = async () => {
      if (initialLibraryItemsRef.current.length === 0) {
        setLoading(true);
      }
      try {
        const items = await fetchPrayerLibraryItems();
        if (!active) {
          return;
        }
        setLibraryItems(items);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        const message =
          nextError instanceof Error ? nextError.message : 'Failed to load prayer library.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadLibrary();

    return () => {
      active = false;
    };
  }, []);

  const favoriteCount = favoriteIds.filter((id) =>
    libraryItems.some((item) => item.id === id),
  ).length;
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
    if (
      selectedCategory &&
      selectedCategory !== 'All' &&
      !availableCategories.includes(selectedCategory)
    ) {
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

  const fallbackPrayerCardWidth = useMemo(() => {
    const laneWidth = windowWidth - SCREEN_PAD_X * 2 - CARD_PADDING_LG * 2 - 2;
    return Math.max(200, laneWidth);
  }, [windowWidth]);

  const prayerCardWidth =
    prayerRailWidth && prayerRailWidth > 0 ? prayerRailWidth : fallbackPrayerCardWidth;

  const prayerCardStep = useMemo(() => prayerCardWidth + HOME_CARD_GAP, [prayerCardWidth]);

  const toggleFavorite = (itemId: string) => {
    setFavoriteIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  };

  const onStartPrayer = (item: PrayerLibraryItem) => {
    void incrementPrayerLibraryStart(item.id).catch(() => {
      // Non-blocking engagement metric update.
    });

    prefetchPrayerScriptVariantByTitle({
      durationMinutes: item.durationMinutes,
      prayerLibraryItemId: item.id,
      title: item.title,
    });
    prefetchPrayerAudio({
      allowGeneration: false,
      durationMinutes: item.durationMinutes,
      language: 'en',
      prayerLibraryItemId: item.id,
      script: item.body,
      title: item.title,
    });

    navigation.navigate('SoloLive', {
      allowAudioGeneration: false,
      durationMinutes: item.durationMinutes,
      intention: item.title,
      prayerLibraryItemId: item.id,
      scriptPreset: item.body,
    });
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} color={colors.textLabel} variant="Label" weight="bold">
          SOLO PRAYER
        </Typography>
        <Typography allowFontScaling={false} style={styles.heroTitle} variant="H1" weight="bold">
          Your intention creates ripple effects.
        </Typography>
      </View>

      <View style={styles.topFilterRow}>
        <FilterChip
          active={libraryMode === 'favorites'}
          fill
          label={`Favorites (${favoriteCount})`}
          onPress={() =>
            setLibraryMode((current) => (current === 'favorites' ? null : 'favorites'))
          }
        />
        <FilterChip
          active={libraryMode === 'recent'}
          fill
          label={`Recent (${recentCount})`}
          onPress={() => setLibraryMode((current) => (current === 'recent' ? null : 'recent'))}
        />
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryRail}
        showsHorizontalScrollIndicator={false}
      >
        {categoryFilters.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategory === category}
            label={category}
            onPress={() =>
              setSelectedCategory((current) => (current === category ? null : category))
            }
            size="sm"
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentMintStart} />
        </View>
      ) : null}

      {error ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            Could not load prayers
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            {error}
          </Typography>
        </SurfaceCard>
      ) : null}

      {!loading && !error && sections.length === 0 ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            No prayers in this filter yet
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            Save prayers to favorites or choose another category to continue.
          </Typography>
        </SurfaceCard>
      ) : null}

      {!loading && !error
        ? sections.map((section) => (
            <SurfaceCard key={section.category} radius="xl" style={styles.categorySection}>
              <View style={styles.sectionHeaderRow}>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {section.category}
                </Typography>
                <Typography
                  allowFontScaling={false}
                  color={colors.textSecondary}
                  variant="Body"
                  weight="bold"
                >
                  {`${section.items.length} prayers`}
                </Typography>
              </View>

              <ScrollView
                horizontal
                decelerationRate="fast"
                onLayout={(event) => {
                  const measuredWidth = event.nativeEvent.layout.width;
                  if (
                    measuredWidth > 0 &&
                    (prayerRailWidth === null || Math.abs(prayerRailWidth - measuredWidth) > 1)
                  ) {
                    setPrayerRailWidth(measuredWidth);
                  }
                }}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / prayerCardStep);
                  const clampedIndex = Math.max(0, Math.min(section.items.length - 1, nextIndex));
                  setActiveSlideByCategory((current) => ({
                    ...current,
                    [section.category]: clampedIndex,
                  }));
                }}
                snapToAlignment="start"
                snapToInterval={prayerCardStep}
                contentContainerStyle={styles.prayerRail}
                showsHorizontalScrollIndicator={false}
              >
                {section.items.map((item) => {
                  const isFavorite = favoriteIds.includes(item.id);
                  const category = normalizeCategory(item.category);

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => onStartPrayer(item)}
                      style={({ pressed }) => [pressed && styles.prayerCardPressed]}
                    >
                      <SurfaceCard
                        contentPadding={spacing.sm}
                        radius="md"
                        style={[styles.prayerCard, { width: prayerCardWidth }]}
                        variant="homeStatSmall"
                      >
                        <View style={styles.prayerCardHeader}>
                          <Typography
                            allowFontScaling={false}
                            style={styles.prayerTitle}
                            variant="H2"
                            weight="bold"
                          >
                            {item.title}
                          </Typography>
                          <Pressable
                            accessibilityLabel={
                              isFavorite ? 'Remove from favorites' : 'Add to favorites'
                            }
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

                        <Typography
                          allowFontScaling={false}
                          color={colors.textSecondary}
                          style={styles.prayerBody}
                        >
                          {item.body}
                        </Typography>
                        <Typography
                          allowFontScaling={false}
                          color={colors.accentSkyStart}
                          variant="Body"
                          weight="bold"
                        >
                          {`${item.durationMinutes} min - ${category}`}
                        </Typography>
                        <Typography
                          allowFontScaling={false}
                          color={colors.textCaption}
                          variant="Caption"
                        >
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
                      <View
                        key={`${section.category}-${item.id}-dot`}
                        style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
                      />
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
  headerBlock: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 27,
    lineHeight: 30,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  prayerBody: {
    minHeight: 68,
  },
  prayerCard: {
    gap: spacing.xs,
    minHeight: 208,
  },
  prayerCardPressed: {
    transform: [{ scale: 0.995 }],
  },
  prayerCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  prayerRail: {
    gap: HOME_CARD_GAP,
    paddingRight: 0,
  },
  prayerTitle: {
    flex: 1,
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
