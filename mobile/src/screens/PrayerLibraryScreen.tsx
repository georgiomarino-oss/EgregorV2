import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchPrayerLibraryItems,
  incrementPrayerLibraryStart,
  type PrayerLibraryItem,
} from '../lib/api/data';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { profileRowGap, sectionGap } from '../theme/layout';
import { colors, radii } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'PrayerLibrary'>;

export function PrayerLibraryScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const [items, setItems] = useState<PrayerLibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLibrary = async () => {
      setLoading(true);
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

    navigation.navigate('SoloLive', {
      intention: selectedItem.title,
      scriptPreset: selectedItem.body,
    });
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <Typography variant="H1" weight="bold">
        Guided prayer library
      </Typography>
      <Typography color={colors.textSecondary}>
        Browse published prayers and start immediately.
      </Typography>

      {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}

      {error ? (
        <SurfaceCard radius="sm" style={styles.libraryCard}>
          <Typography variant="H2" weight="bold">
            Could not load prayer library
          </Typography>
          <Typography color={colors.textSecondary} variant="Caption">
            {error}
          </Typography>
        </SurfaceCard>
      ) : null}

      {!loading && items.length === 0 ? (
        <SurfaceCard radius="sm" style={styles.libraryCard}>
          <Typography variant="H2" weight="bold">
            No public prayers yet
          </Typography>
          <Typography color={colors.textSecondary} variant="Caption">
            Add entries to `prayer_library_items` in Supabase to populate this library.
          </Typography>
          <Button
            onPress={() => navigation.navigate('SoloSetup')}
            title="Start from your own intention"
            variant="secondary"
          />
        </SurfaceCard>
      ) : (
        items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={styles.pressable}
            >
              <SurfaceCard
                radius="md"
                style={[styles.libraryCard, selected && styles.libraryCardActive]}
              >
                <Typography variant="H2" weight="bold">
                  {item.title}
                </Typography>
                <Typography color={colors.textSecondary} variant="Caption">
                  {item.subtitle}
                </Typography>
              </SurfaceCard>
            </Pressable>
          );
        })
      )}

      <Button
        disabled={!selectedItem}
        loading={starting}
        onPress={() => void onStartSelected()}
        title="Start selected prayer"
        variant="gold"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  libraryCard: {
    gap: profileRowGap,
  },
  libraryCardActive: {
    borderColor: figmaV2Reference.buttons.gold.border,
  },
  pressable: {
    borderRadius: radii.md,
  },
});
