import { Pressable, StyleSheet, View } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { tabBarInsetX } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

const TAB_ICON_SIZE = 23;

function TabLogo({ color, routeName }: { color: string; routeName: string }) {
  const sharedFillProps = {
    fill: color,
  };

  if (routeName === 'CommunityTab') {
    return (
      <Svg height={TAB_ICON_SIZE} viewBox="0 0 24 24" width={TAB_ICON_SIZE}>
        <Path
          {...sharedFillProps}
          d="M5,15L4.4,14.5C2.4,12.6 1,11.4 1,9.9C1,8.7 2,7.7 3.2,7.7C3.9,7.7 4.6,8 5,8.5C5.4,8 6.1,7.7 6.8,7.7C8,7.7 9,8.6 9,9.9C9,11.4 7.6,12.6 5.6,14.5L5,15M15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4M15,10.1A2.1,2.1 0 0,1 12.9,8A2.1,2.1 0 0,1 15,5.9C16.16,5.9 17.1,6.84 17.1,8C17.1,9.16 16.16,10.1 15,10.1M15,13C12.33,13 7,14.33 7,17V20H23V17C23,14.33 17.67,13 15,13M21.1,18.1H8.9V17C8.9,16.36 12,14.9 15,14.9C17.97,14.9 21.1,16.36 21.1,17V18.1Z"
        />
      </Svg>
    );
  }

  if (routeName === 'SoloTab') {
    return (
      <Svg height={TAB_ICON_SIZE} viewBox="0 0 24 24" width={TAB_ICON_SIZE}>
        <Path
          {...sharedFillProps}
          d="M11.43 9.67C11.47 9.78 11.5 9.88 11.5 10V15.22C11.5 15.72 11.31 16.2 10.97 16.57L8.18 19.62L4.78 16.22L6 15L8.8 2.86C8.92 2.36 9.37 2 9.89 2C10.5 2 11 2.5 11 3.11V8.07C10.84 8.03 10.67 8 10.5 8C9.4 8 8.5 8.9 8.5 10V13C8.5 13.28 8.72 13.5 9 13.5S9.5 13.28 9.5 13V10C9.5 9.45 9.95 9 10.5 9C10.69 9 10.85 9.07 11 9.16C11.12 9.23 11.21 9.32 11.3 9.42C11.33 9.46 11.36 9.5 11.38 9.55C11.4 9.59 11.42 9.63 11.43 9.67M2 19L6 22L7.17 20.73L3.72 17.28L2 19M18 15L15.2 2.86C15.08 2.36 14.63 2 14.11 2C13.5 2 13 2.5 13 3.11V8.07C13.16 8.03 13.33 8 13.5 8C14.6 8 15.5 8.9 15.5 10V13C15.5 13.28 15.28 13.5 15 13.5S14.5 13.28 14.5 13V10C14.5 9.45 14.05 9 13.5 9C13.31 9 13.15 9.07 13 9.16C12.88 9.23 12.79 9.32 12.71 9.42C12.68 9.46 12.64 9.5 12.62 9.55C12.6 9.59 12.58 9.63 12.57 9.67C12.53 9.78 12.5 9.88 12.5 10V15.22C12.5 15.72 12.69 16.2 13.03 16.57L15.82 19.62L19.22 16.22L18 15M20.28 17.28L16.83 20.73L18 22L22 19L20.28 17.28Z"
        />
      </Svg>
    );
  }

  if (routeName === 'EventsTab') {
    return (
      <Svg height={TAB_ICON_SIZE} viewBox="0 0 24 24" width={TAB_ICON_SIZE}>
        <Path
          {...sharedFillProps}
          d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
        />
      </Svg>
    );
  }

  return (
    <Svg height={TAB_ICON_SIZE} viewBox="0 0 24 24" width={TAB_ICON_SIZE}>
      <Path
        {...sharedFillProps}
        d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z"
      />
    </Svg>
  );
}

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
          const title = descriptor?.options.title;
          const optionLabel = descriptor?.options.tabBarLabel;
          const label =
            typeof optionLabel === 'string'
              ? optionLabel
              : typeof title === 'string'
                ? title
                : route.name;

          return (
            <Pressable
              accessibilityLabel={label}
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
              <TabLogo
                color={isFocused ? figmaV2Reference.text.activeTab : colors.textMuted}
                routeName={route.name}
              />
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
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
  },
  wrapper: {
    paddingHorizontal: tabBarInsetX,
    paddingTop: spacing.xs,
  },
});
