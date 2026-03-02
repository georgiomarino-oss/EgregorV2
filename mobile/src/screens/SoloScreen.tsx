import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { HOME_CARD_GAP, PROFILE_SECTION_GAP, SCREEN_PAD_X } from '../theme/figmaV2Layout';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { colors, radii, spacing } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloHome'>;
type LibraryMode = 'favorites' | 'recent' | null;
type PrayerCategory =
  | 'Relationships'
  | 'Wellbeing'
  | 'Abundance'
  | 'Purpose'
  | 'Protection'
  | 'Gratitude';

type CategoryFilter = 'All' | PrayerCategory;

interface PrayerCardItem {
  category: PrayerCategory;
  body: string;
  durationLabel: string;
  id: string;
  tags: string;
  title: string;
}

const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  'All',
  'Relationships',
  'Wellbeing',
  'Abundance',
  'Purpose',
  'Protection',
  'Gratitude',
];

const SOLO_PRAYER_LIBRARY: readonly PrayerCardItem[] = [
  {
    body: 'Guide this bond with patience, trust, and healthy communication that strengthens connection.',
    category: 'Relationships',
    durationLabel: '3-10 min',
    id: 'relationships-1',
    tags: 'Connection - Harmony',
    title: 'Prayer for Family Unity',
  },
  {
    body: 'Bring peace to conversations and clarity to unresolved moments so healing can continue.',
    category: 'Relationships',
    durationLabel: '5-12 min',
    id: 'relationships-2',
    tags: 'Reconciliation - Peace',
    title: 'Prayer for Reconciliation',
  },
  {
    body: 'Anchor the mind, steady the breath, and restore calm energy for the day ahead.',
    category: 'Wellbeing',
    durationLabel: '3-8 min',
    id: 'wellbeing-1',
    tags: 'Calm - Recovery',
    title: 'Prayer for Inner Calm',
  },
  {
    body: 'Support healthy routines, deep rest, and resilience through every challenge.',
    category: 'Wellbeing',
    durationLabel: '5-10 min',
    id: 'wellbeing-2',
    tags: 'Rest - Strength',
    title: 'Prayer for Rest and Renewal',
  },
  {
    body: 'Open pathways for provision, wise decisions, and meaningful opportunities.',
    category: 'Abundance',
    durationLabel: '4-9 min',
    id: 'abundance-1',
    tags: 'Provision - Opportunity',
    title: 'Prayer for Provision',
  },
  {
    body: 'Align resources with purpose and invite generosity, discipline, and gratitude.',
    category: 'Abundance',
    durationLabel: '5-11 min',
    id: 'abundance-2',
    tags: 'Stewardship - Gratitude',
    title: 'Prayer for Responsible Growth',
  },
  {
    body: 'Clarify priorities and reveal the next right step with courage and consistency.',
    category: 'Purpose',
    durationLabel: '4-8 min',
    id: 'purpose-1',
    tags: 'Direction - Focus',
    title: 'Prayer for Clear Purpose',
  },
  {
    body: 'Strengthen conviction and serve with humility in every mission you are called to.',
    category: 'Purpose',
    durationLabel: '5-10 min',
    id: 'purpose-2',
    tags: 'Calling - Service',
    title: 'Prayer for Meaningful Work',
  },
  {
    body: 'Cover your home and loved ones with safety, wisdom, and steady protection.',
    category: 'Protection',
    durationLabel: '3-7 min',
    id: 'protection-1',
    tags: 'Safety - Home',
    title: 'Prayer for Household Protection',
  },
  {
    body: 'Guard each journey with attentiveness, safe passage, and peaceful arrival.',
    category: 'Protection',
    durationLabel: '3-6 min',
    id: 'protection-2',
    tags: 'Travel - Protection',
    title: 'Prayer for Safe Travel',
  },
  {
    body: 'Center the heart in gratitude for daily gifts, lessons, and faithful support.',
    category: 'Gratitude',
    durationLabel: '3-6 min',
    id: 'gratitude-1',
    tags: 'Thankfulness - Joy',
    title: 'Prayer of Daily Gratitude',
  },
  {
    body: 'Reflect with humility, celebrate progress, and carry gratitude into tomorrow.',
    category: 'Gratitude',
    durationLabel: '4-8 min',
    id: 'gratitude-2',
    tags: 'Reflection - Hope',
    title: 'Prayer for Evening Reflection',
  },
];

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
  const [libraryMode, setLibraryMode] = useState<LibraryMode>('recent');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter | null>('All');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeSlideByCategory, setActiveSlideByCategory] = useState<
    Partial<Record<PrayerCategory, number>>
  >({});

  const favoriteCount = favoriteIds.length;
  const recentCount = SOLO_PRAYER_LIBRARY.length;

  const visibleLibrary = useMemo(() => {
    if (libraryMode === 'favorites') {
      return SOLO_PRAYER_LIBRARY.filter((item) => favoriteIds.includes(item.id));
    }

    return SOLO_PRAYER_LIBRARY;
  }, [favoriteIds, libraryMode]);

  const sections = useMemo(() => {
    const categories =
      !selectedCategory || selectedCategory === 'All'
        ? CATEGORY_FILTERS.filter((item): item is PrayerCategory => item !== 'All')
        : [selectedCategory];

    return categories
      .map((category) => ({
        category,
        items: visibleLibrary.filter((item) => item.category === category),
      }))
      .filter((section) => section.items.length > 0);
  }, [selectedCategory, visibleLibrary]);

  const prayerCardWidth = useMemo(() => {
    const estimatedWidth = windowWidth - SCREEN_PAD_X * 2 - 96;
    return Math.min(274, Math.max(220, estimatedWidth));
  }, [windowWidth]);

  const prayerCardStep = useMemo(() => prayerCardWidth + HOME_CARD_GAP, [prayerCardWidth]);

  const toggleFavorite = (itemId: string) => {
    setFavoriteIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <SurfaceCard radius="xl" style={styles.heroCard} variant="welcomeMain">
        <Typography allowFontScaling={false} color={colors.textLabel} variant="Label" weight="bold">
          SOLO PRAYER
        </Typography>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Your intention creates ripple effects.
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary} variant="bodyLg">
          Browse by category and swipe through prayers with one tap start.
        </Typography>
      </SurfaceCard>

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
        {CATEGORY_FILTERS.map((category) => (
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

      {sections.length === 0 ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            No prayers in this filter yet
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            Save prayers to favorites or choose another category to continue.
          </Typography>
        </SurfaceCard>
      ) : (
        sections.map((section) => (
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

                return (
                  <SurfaceCard
                    key={item.id}
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
                        onPress={() => toggleFavorite(item.id)}
                        style={({ pressed }) => [
                          styles.favoriteButton,
                          isFavorite && styles.favoriteButtonActive,
                          pressed && styles.favoritePressed,
                        ]}
                      >
                        <Typography
                          allowFontScaling={false}
                          color={isFavorite ? colors.textOnSky : colors.textSecondary}
                          variant="H2"
                          weight="bold"
                        >
                          {isFavorite ? 'Saved' : 'Save'}
                        </Typography>
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
                      {`${item.durationLabel} - ${item.category}`}
                    </Typography>
                    <Typography
                      allowFontScaling={false}
                      color={colors.textCaption}
                      variant="Caption"
                    >
                      {item.tags}
                    </Typography>
                    <Pressable
                      onPress={() =>
                        navigation.navigate('SoloLive', {
                          intention: item.title,
                          scriptPreset: item.body,
                        })
                      }
                      style={({ pressed }) => [
                        styles.startButton,
                        pressed && styles.startButtonPressed,
                      ]}
                    >
                      <Typography
                        allowFontScaling={false}
                        color={colors.textOnSky}
                        variant="H2"
                        weight="bold"
                      >
                        Start prayer
                      </Typography>
                    </Pressable>
                  </SurfaceCard>
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
      )}
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
    minWidth: 68,
    paddingHorizontal: spacing.sm,
  },
  favoriteButtonActive: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
  },
  favoritePressed: {
    transform: [{ scale: 0.97 }],
  },
  heroCard: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
  prayerRail: {
    gap: HOME_CARD_GAP,
    paddingRight: spacing.sm,
  },
  prayerTitle: {
    flex: 1,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  startButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  startButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  topFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
