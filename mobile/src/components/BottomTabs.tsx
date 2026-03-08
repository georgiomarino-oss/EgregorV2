import { Pressable, StyleSheet, View } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { tabBarInsetX } from '../theme/layout';
import { colors, navigationSurface, radii, spacing } from '../theme/tokens';

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
          d="M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M5,7A2,2 0 0,1 7,9A2,2 0 0,1 5,11A2,2 0 0,1 3,9A2,2 0 0,1 5,7M19,7A2,2 0 0,1 21,9A2,2 0 0,1 19,11A2,2 0 0,1 17,9A2,2 0 0,1 19,7M12,13C15.31,13 18,15.24 18,18V20H6V18C6,15.24 8.69,13 12,13M5,13C6.1,13 7.15,13.28 8.06,13.78C7.4,14.67 7,15.79 7,17V18H1V17C1,14.79 2.79,13 5,13M19,13C21.21,13 23,14.79 23,17V18H17V17C17,15.79 16.6,14.67 15.94,13.78C16.85,13.28 17.9,13 19,13Z"
        />
      </Svg>
    );
  }

  if (routeName === 'SoloTab') {
    return (
      <Svg height={TAB_ICON_SIZE} viewBox="0 0 24 24" width={TAB_ICON_SIZE}>
        <Path {...sharedFillProps} d="M12 3L2 12H5V21H10V15H14V21H19V12H22L12 3Z" />
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
  const focusedRouteKey = state.routes[state.index]?.key;
  const focusedOptions = focusedRouteKey ? descriptors[focusedRouteKey]?.options : undefined;
  const tabBarStyles = focusedOptions?.tabBarStyle
    ? Array.isArray(focusedOptions.tabBarStyle)
      ? focusedOptions.tabBarStyle
      : [focusedOptions.tabBarStyle]
    : [];
  const hideTabBar = tabBarStyles.some(
    (style) => ((style as { display?: string } | undefined)?.display ?? '') === 'none',
  );

  if (hideTabBar) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <LinearGradient
        colors={figmaV2Reference.tabs.containerGradient.colors}
        end={points.end}
        locations={figmaV2Reference.tabs.containerGradient.locations}
        start={points.start}
        style={styles.container}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.containerGlow}
        />
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
              style={styles.tabButton}
            >
              <View style={styles.iconBubbleWrap}>
                {isFocused ? <View style={styles.iconBubbleHalo} /> : null}
                <View style={[styles.iconBubble, isFocused && styles.iconBubbleActive]}>
                  <TabLogo
                    color={isFocused ? figmaV2Reference.text.activeTab : colors.textMuted}
                    routeName={route.name}
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: navigationSurface.tabBar.backgroundFrom,
    borderColor: navigationSurface.tabBar.border,
    borderRadius: radii.lg,
    borderWidth: figmaV2Reference.tabs.containerBorderWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  containerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: navigationSurface.tabBar.glow,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 0,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  iconBubbleActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: 'transparent',
    borderWidth: 0,
  },
  iconBubbleHalo: {
    backgroundColor: 'transparent',
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderWidth: figmaV2Reference.tabs.activeBorderWidth,
    borderRadius: radii.pill,
    height: 52,
    opacity: 0.85,
    position: 'absolute',
    width: 52,
  },
  iconBubbleWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    overflow: 'visible',
    width: 52,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    shadowOpacity: 0,
  },
  wrapper: {
    paddingHorizontal: tabBarInsetX,
    paddingTop: spacing.xs,
  },
});
