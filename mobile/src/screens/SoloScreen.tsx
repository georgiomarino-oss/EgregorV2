import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { Screen } from '../components/Screen';
import { PrayerCard } from '../features/solo/components/PrayerCard';
import { SoloCategoryChips } from '../features/solo/components/SoloCategoryChips';
import { SoloHero } from '../features/solo/components/SoloHero';
import { SoloSection } from '../features/solo/components/SoloSection';
import {
  fetchPrayerLibraryItems,
  getCachedPrayerLibraryItems,
  incrementPrayerLibraryStart,
  prefetchPrayerScriptVariantByTitle,
  type PrayerLibraryItem,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { HOME_CARD_GAP, PROFILE_SECTION_GAP, SCREEN_PAD_X } from '../theme/figmaV2Layout';
import { CARD_PADDING_LG } from '../theme/layout';
import { radii, soloSurface, spacing } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloHome'>;
type LibraryMode = 'favorites' | 'recent' | null;
type CategoryFilter = 'All' | string | null;

function normalizeCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value && value.length > 0 ? value : 'General';
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
      <SoloHero
        actionLabel="Open full library"
        favoriteCount={favoriteCount}
        onActionPress={() => navigation.navigate('PrayerLibrary')}
        recentCount={recentCount}
        subtitle="Choose a guided prayer and begin instantly in your private room."
        title="Your intention creates ripple effects."
        totalCount={libraryItems.length}
      />

      <SoloCategoryChips
        categories={categoryFilters}
        favoriteCount={favoriteCount}
        libraryMode={libraryMode}
        onSelectCategory={(category) =>
          setSelectedCategory((current) => (current === category ? null : category))
        }
        onToggleLibraryMode={(mode) =>
          setLibraryMode((current) => (current === mode ? null : mode))
        }
        recentCount={recentCount}
        selectedCategory={selectedCategory}
      />

      {loading ? (
        <LoadingStateCard
          compact
          subtitle="Preparing your prayer library."
          title="Loading prayers"
        />
      ) : null}

      {error ? <InlineErrorCard message={error} title="Could not load prayers" /> : null}

      {!loading && !error && sections.length === 0 ? (
        <EmptyStateCard
          backgroundColor={soloSurface.section.panelBackground}
          body="Save prayers to favorites or choose another category to continue."
          bodyColor={soloSurface.section.subtitle}
          borderColor={soloSurface.section.panelBorder}
          iconBackgroundColor={soloSurface.hero.badgeBackground}
          iconBorderColor={soloSurface.hero.badgeBorder}
          iconName="book-open-page-variant-outline"
          iconTint={soloSurface.hero.badgeText}
          title="No prayers in this filter yet"
          titleColor={soloSurface.section.title}
        />
      ) : null}

      {!loading && !error
        ? sections.map((section) => (
            <SoloSection
              countLabel={`${section.items.length} prayers`}
              key={section.category}
              subtitle={
                libraryMode === 'favorites'
                  ? 'Saved for moments when you want to begin quickly.'
                  : 'Curated guidance for a calm and focused start.'
              }
              title={section.category}
            >
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
                {section.items.map((item, index) => {
                  const isFavorite = favoriteIds.includes(item.id);
                  const category = normalizeCategory(item.category);

                  return (
                    <PrayerCard
                      categoryLabel={category}
                      featured={index === 0}
                      isFavorite={isFavorite}
                      key={item.id}
                      item={item}
                      onStartPrayer={() => onStartPrayer(item)}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                      orderIndex={index}
                      width={prayerCardWidth}
                    />
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
            </SoloSection>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: soloSurface.section.dotActive,
    borderColor: soloSurface.section.dotActive,
  },
  dotInactive: {
    backgroundColor: soloSurface.section.dotInactiveBackground,
    borderColor: soloSurface.section.dotInactiveBorder,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
  },
  prayerRail: {
    gap: HOME_CARD_GAP,
    paddingRight: 0,
  },
});
