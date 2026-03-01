import { Pressable, StyleSheet, View } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { colors, radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

const tabLabelByRoute: Record<string, string> = {
  SoloTab: 'Solo',
  CommunityTab: 'Home',
  EventsTab: 'Events',
  ProfileTab: 'Profile',
};

export function BottomTabs({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const points = cssAngleToLinearPoints(figmaV2Reference.tabs.containerGradient.angleDeg);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <LinearGradient
        colors={figmaV2Reference.tabs.containerGradient.colors}
        end={points.end}
        locations={figmaV2Reference.tabs.containerGradient.locations}
        start={points.start}
        style={styles.container}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          const optionLabel = descriptor?.options.tabBarLabel;
          let label = descriptor?.options.title ?? tabLabelByRoute[route.name] ?? route.name;

          if (typeof optionLabel === 'string') {
            label = optionLabel;
          }

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: 'tabPress',
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => {
                navigation.emit({
                  target: route.key,
                  type: 'tabLongPress',
                });
              }}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
            >
              <Typography
                color={isFocused ? figmaV2Reference.text.activeTab : colors.textMuted}
                variant="Label"
                weight="regular"
              >
                {label}
              </Typography>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: figmaV2Reference.tabs.containerBorder,
    borderRadius: radii.lg,
    borderWidth: figmaV2Reference.tabs.containerBorderWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  tabButton: {
    alignItems: 'center',
    borderColor: figmaV2Reference.tabs.inactiveBorder,
    borderRadius: radii.xs,
    borderWidth: figmaV2Reference.tabs.activeBorderWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
  },
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
