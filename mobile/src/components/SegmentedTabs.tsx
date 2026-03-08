import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import type { SectionThemeKey } from '../theme/tokens';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { crossApp, interaction, radii, sectionVisualThemes, spacing } from '../theme/tokens';
import { Typography } from './Typography';

interface SegmentedTabsOption {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  activeKey: string | null;
  onChange: (nextKey: string) => void;
  options: SegmentedTabsOption[];
  section?: SectionThemeKey;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs({
  activeKey,
  onChange,
  options,
  section,
  style,
}: SegmentedTabsProps) {
  const sectionPalette = section ? sectionVisualThemes[section] : null;

  return (
    <View
      style={[
        styles.wrap,
        sectionPalette
          ? {
              backgroundColor: sectionPalette.surface.card[1],
              borderColor: sectionPalette.surface.edge,
            }
          : null,
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.key === activeKey;
        const activeLabelColor = sectionPalette
          ? sectionPalette.nav.labelActive
          : figmaV2Reference.text.activeTab;
        const idleLabelColor = sectionPalette
          ? sectionPalette.nav.labelIdle
          : figmaV2Reference.text.caption;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={4}
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.tab,
              active
                ? sectionPalette
                  ? {
                      borderColor: sectionPalette.nav.itemBorder,
                    }
                  : styles.tabActive
                : sectionPalette
                  ? {
                      backgroundColor: sectionPalette.surface.card[0],
                      borderColor: sectionPalette.surface.border,
                    }
                  : styles.tabIdle,
              pressed ? styles.tabPressed : null,
            ]}
          >
            {active && sectionPalette ? (
              <LinearGradient
                colors={sectionPalette.nav.itemActive}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.activeOverlay}
              />
            ) : null}
            <Typography color={active ? activeLabelColor : idleLabelColor} variant="Caption" weight="bold">
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
  },
  tabIdle: {
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.tabs.containerBorder,
  },
  tabPressed: {
    opacity: interaction.chip.inactiveOpacity,
    transform: [{ scale: interaction.chip.pressedScale }],
  },
  wrap: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: crossApp.hero.borderRadius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xxs,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export type { SegmentedTabsOption, SegmentedTabsProps };
