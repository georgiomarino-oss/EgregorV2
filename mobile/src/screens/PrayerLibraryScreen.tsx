import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { colors, radii, spacing } from '../theme/tokens';

interface LibraryItem {
  id: string;
  subtitle: string;
  title: string;
}

const libraryItems: LibraryItem[] = [
  {
    id: 'peace',
    subtitle: '5 min • Compassion • 2.4k starts',
    title: 'Peace in uncertainty',
  },
  {
    id: 'healing-wave',
    subtitle: '10 min • Global events • 1.1k starts',
    title: 'Collective healing wave',
  },
  {
    id: 'protection',
    subtitle: '3 min • Family focus • 3.8k starts',
    title: 'Protection and grounding',
  },
  {
    id: 'gratitude',
    subtitle: '5 min • Integration • 1.9k starts',
    title: 'Gratitude closing prayer',
  },
];

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'PrayerLibrary'>;
const fallbackItem: LibraryItem = {
  id: 'fallback',
  subtitle: '5 min • Peace',
  title: 'Peace in uncertainty',
};

export function PrayerLibraryScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const [selectedId, setSelectedId] = useState(libraryItems[0]?.id ?? '');

  const selectedItem = useMemo(
    () => libraryItems.find((item) => item.id === selectedId) ?? libraryItems[0] ?? fallbackItem,
    [selectedId],
  );

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="solo">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Guided prayer library
        </Typography>
        <Typography color={colors.textSecondary}>
          Browse curated scripts and start instantly with preserved AI/audio wiring.
        </Typography>

        {libraryItems.map((item) => {
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
        })}

        <Button
          onPress={() =>
            navigation.navigate('SoloLive', {
              intention: selectedItem.title,
              scriptPreset: selectedItem.title,
            })
          }
          title="Start selected prayer"
          variant="gold"
        />
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  libraryCard: {
    gap: spacing.xs,
  },
  libraryCardActive: {
    borderColor: figmaV2Reference.buttons.gold.border,
  },
  pressable: {
    borderRadius: radii.md,
  },
});
