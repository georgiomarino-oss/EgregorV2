import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { SoloHero } from '../features/solo/components/SoloHero';
import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import {
  fetchPrayerLibraryItems,
  getCachedPrayerLibraryItems,
  incrementPrayerLibraryStart,
  prefetchPrayerScriptVariantByTitle,
  type PrayerLibraryItem,
} from '../lib/api/data';
import { prefetchPrayerAudio } from '../lib/api/functions';
import { profileRowGap, sectionGap } from '../theme/layout';
import { radii, soloSurface, spacing } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'PrayerLibrary'>;

export function PrayerLibraryScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const reduceMotionEnabled = useReducedMotion();
  const initialItemsRef = useRef<PrayerLibraryItem[]>(getCachedPrayerLibraryItems() ?? []);
  const [items, setItems] = useState<PrayerLibraryItem[]>(initialItemsRef.current);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItemsRef.current[0]?.id ?? null,
  );
  const [loading, setLoading] = useState(initialItemsRef.current.length === 0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLibrary = async () => {
      if (initialItemsRef.current.length === 0) {
        setLoading(true);
      }
      try {
        const nextItems = await fetchPrayerLibraryItems();
        if (!active) {
          return;
        }
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load prayer library.');
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

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const onStartSelected = async () => {
    if (!selectedItem) {
      return;
    }

    setStarting(true);
    try {
      await incrementPrayerLibraryStart(selectedItem.id);
    } catch {
      // Non-blocking usage metric update.
    } finally {
      setStarting(false);
    }

    prefetchPrayerScriptVariantByTitle({
      durationMinutes: selectedItem.durationMinutes,
      prayerLibraryItemId: selectedItem.id,
      title: selectedItem.title,
    });
    prefetchPrayerAudio({
      allowGeneration: false,
      durationMinutes: selectedItem.durationMinutes,
      language: 'en',
      prayerLibraryItemId: selectedItem.id,
      script: selectedItem.body,
      title: selectedItem.title,
    });

    navigation.navigate('SoloLive', {
      allowAudioGeneration: false,
      durationMinutes: selectedItem.durationMinutes,
      intention: selectedItem.title,
      prayerLibraryItemId: selectedItem.id,
      scriptPreset: selectedItem.body,
    });
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <SoloHero
        actionLabel="Use your own intention"
        favoriteCount={0}
        onActionPress={() => navigation.navigate('SoloSetup')}
        recentCount={items.length}
        subtitle="Browse published prayers and start immediately with one tap."
        title="Guided prayer library"
        totalCount={items.length}
      />

      {loading ? (
        <LoadingStateCard
          compact
          subtitle="Syncing the latest public prayers."
          title="Loading prayer library"
        />
      ) : null}

      {error ? <InlineErrorCard message={error} title="Could not load prayer library" /> : null}

      {!loading && items.length === 0 ? (
        <EmptyStateCard
          action={
            <Button
              onPress={() => navigation.navigate('SoloSetup')}
              title="Start from your own intention"
              variant="secondary"
            />
          }
          backgroundColor={soloSurface.section.panelBackground}
          body="Add entries to `prayer_library_items` in Supabase to populate this library."
          bodyColor={soloSurface.section.subtitle}
          borderColor={soloSurface.section.panelBorder}
          iconBackgroundColor={soloSurface.hero.badgeBackground}
          iconBorderColor={soloSurface.hero.badgeBorder}
          iconName="book-open-blank-variant"
          iconTint={soloSurface.hero.badgeText}
          title="No public prayers yet"
          titleColor={soloSurface.section.title}
        />
      ) : (
        <SurfaceCard contentPadding={spacing.sm} radius="xl" style={styles.librarySectionCard}>
          <View style={styles.sectionHeader}>
            <Typography
              accessibilityRole="header"
              allowFontScaling={false}
              color={soloSurface.section.title}
              variant="H2"
              weight="bold"
            >
              Library collection
            </Typography>
            <Typography
              allowFontScaling={false}
              color={soloSurface.section.count}
              variant="Caption"
              weight="bold"
            >
              {`${items.length} prayers`}
            </Typography>
          </View>
          <Typography
            allowFontScaling={false}
            color={soloSurface.section.subtitle}
            variant="Caption"
          >
            Select one prayer to begin your solo session.
          </Typography>

          <View style={styles.itemsList}>
            {items.map((item) => {
              const selected = item.id === selectedId;

              return (
                <Pressable
                  accessibilityHint="Selects this prayer as your current choice."
                  accessibilityLabel={`${item.title}. ${item.subtitle}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={({ pressed }) => [
                    styles.pressable,
                    !reduceMotionEnabled && pressed && styles.cardPressed,
                  ]}
                >
                  <SurfaceCard
                    contentPadding={spacing.sm}
                    radius="md"
                    style={[styles.libraryCard, selected && styles.libraryCardActive]}
                  >
                    <Typography
                      allowFontScaling={false}
                      color={soloSurface.card.title}
                      variant="H2"
                      weight="bold"
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      allowFontScaling={false}
                      color={soloSurface.library.subtitle}
                      variant="Caption"
                    >
                      {item.subtitle}
                    </Typography>
                  </SurfaceCard>
                </Pressable>
              );
            })}
          </View>
        </SurfaceCard>
      )}

      <SurfaceCard contentPadding={spacing.sm} radius="xl" style={styles.actionPanel}>
        <Typography allowFontScaling={false} color={soloSurface.section.subtitle} variant="Caption">
          {selectedItem
            ? `Ready to start: ${selectedItem.title}`
            : 'Select a prayer above to begin your session.'}
        </Typography>
        <Button
          disabled={!selectedItem}
          loading={starting}
          onPress={() => void onStartSelected()}
          title="Start selected prayer"
          variant="gold"
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionPanel: {
    backgroundColor: soloSurface.library.actionPanelBackground,
    borderColor: soloSurface.library.actionPanelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
  },
  content: {
    gap: sectionGap,
  },
  itemsList: {
    gap: profileRowGap,
  },
  libraryCard: {
    backgroundColor: soloSurface.library.itemBackground,
    borderColor: soloSurface.library.itemBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: profileRowGap,
  },
  libraryCardActive: {
    backgroundColor: soloSurface.library.itemActiveBackground,
    borderColor: soloSurface.library.itemActiveBorder,
  },
  librarySectionCard: {
    backgroundColor: soloSurface.section.panelBackground,
    borderColor: soloSurface.section.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: profileRowGap,
  },
  pressable: {
    borderRadius: radii.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
