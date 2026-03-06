import { ScrollView, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '../../../components/Typography';
import { interaction, radii, soloSurface, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

type LibraryMode = 'favorites' | 'recent' | null;

interface SoloCategoryChipsProps {
  categories: string[];
  favoriteCount: number;
  libraryMode: LibraryMode;
  onSelectCategory: (category: string) => void;
  onToggleLibraryMode: (mode: Exclude<LibraryMode, null>) => void;
  recentCount: number;
  selectedCategory: string | null;
}

function Chip({
  active,
  label,
  onPress,
  size = 'md',
  tone = 'mode',
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  size?: 'md' | 'sm';
  tone?: 'category' | 'mode';
}) {
  const isCategory = tone === 'category';
  const reduceMotionEnabled = useReducedMotion();
  const activeStyle = isCategory ? styles.categoryActive : styles.modeActive;
  const inactiveStyle = isCategory ? styles.categoryInactive : styles.modeInactive;
  const textColor = active
    ? isCategory
      ? soloSurface.filters.categoryChipActiveText
      : soloSurface.filters.modeChipActiveText
    : isCategory
      ? soloSurface.filters.categoryChipText
      : soloSurface.filters.modeChipText;

  return (
    <Pressable
      accessibilityHint={
        isCategory ? 'Filters prayers by category.' : 'Filters your solo prayer library.'
      }
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        size === 'sm' ? styles.chipSm : styles.chipMd,
        active ? activeStyle : inactiveStyle,
        !reduceMotionEnabled && pressed && styles.chipPressed,
      ]}
    >
      <Typography
        allowFontScaling={false}
        color={textColor}
        style={styles.chipText}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
    </Pressable>
  );
}

export function SoloCategoryChips({
  categories,
  favoriteCount,
  libraryMode,
  onSelectCategory,
  onToggleLibraryMode,
  recentCount,
  selectedCategory,
}: SoloCategoryChipsProps) {
  return (
    <View style={styles.root}>
      <View style={styles.modeRow}>
        <Chip
          active={libraryMode === 'favorites'}
          label={`Favorites (${favoriteCount})`}
          onPress={() => onToggleLibraryMode('favorites')}
        />
        <Chip
          active={libraryMode === 'recent'}
          label={`Recent (${recentCount})`}
          onPress={() => onToggleLibraryMode('recent')}
        />
      </View>

      <View style={styles.categoryShell}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryRail}
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((category) => (
            <Chip
              active={selectedCategory === category}
              key={category}
              label={category}
              onPress={() => onSelectCategory(category)}
              size="sm"
              tone="category"
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryActive: {
    backgroundColor: soloSurface.filters.categoryChipActiveBackground,
    borderColor: soloSurface.filters.categoryChipActiveBorder,
  },
  categoryInactive: {
    backgroundColor: soloSurface.filters.categoryChipBackground,
    borderColor: soloSurface.filters.categoryChipBorder,
    opacity: interaction.chip.inactiveOpacity,
  },
  categoryRail: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  categoryShell: {
    backgroundColor: soloSurface.filters.categoryShellBackground,
    borderColor: soloSurface.filters.categoryShellBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  chipMd: {
    minHeight: 34,
  },
  chipPressed: {
    transform: [{ scale: interaction.chip.pressedScale }],
  },
  chipSm: {
    minHeight: 30,
    minWidth: 60,
  },
  chipText: {
    lineHeight: 14,
    textTransform: 'none',
  },
  modeActive: {
    backgroundColor: soloSurface.filters.modeChipActiveBackground,
    borderColor: soloSurface.filters.modeChipActiveBorder,
  },
  modeInactive: {
    backgroundColor: soloSurface.filters.modeChipBackground,
    borderColor: soloSurface.filters.modeChipBorder,
    opacity: interaction.chip.inactiveOpacity,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  root: {
    gap: spacing.sm,
  },
});
