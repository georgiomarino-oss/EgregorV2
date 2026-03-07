import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { figmaV2Reference } from '../theme/figma-v2-reference';
import { crossApp, interaction, radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

interface SegmentedTabsOption {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  activeKey: string | null;
  onChange: (nextKey: string) => void;
  options: SegmentedTabsOption[];
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs({ activeKey, onChange, options, style }: SegmentedTabsProps) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((option) => {
        const active = option.key === activeKey;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : styles.tabIdle,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Typography
              color={active ? figmaV2Reference.text.activeTab : figmaV2Reference.text.caption}
              variant="Caption"
              weight="bold"
            >
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
    minHeight: 34,
    paddingHorizontal: spacing.sm,
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
    borderRadius: crossApp.hero.borderRadius,
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

export type { SegmentedTabsOption, SegmentedTabsProps };
