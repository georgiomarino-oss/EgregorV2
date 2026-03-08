import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { tabBarInsetX } from '../theme/layout';
import {
  getSectionThemeByRoute,
  getSectionThemePalette,
} from '../theme/sectionTheme';
import { radii, spacing, transitionMotion } from '../theme/tokens';
import { Typography } from './Typography';

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

function SectionNavLayer({ section }: { section: ReturnType<typeof getSectionThemeByRoute> }) {
  const palette = getSectionThemePalette(section);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={palette.nav.gradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.sectionGlow, { backgroundColor: palette.nav.edgeGlow }]} />
      <View style={[styles.sectionOrbLeft, { backgroundColor: palette.background.orbA }]} />
      <View style={[styles.sectionOrbRight, { backgroundColor: palette.background.orbB }]} />
    </View>
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

  const activeRouteName = state.routes[state.index]?.name ?? 'SoloTab';
  const nextSection = getSectionThemeByRoute(activeRouteName);
  const [currentSection, setCurrentSection] = useState(nextSection);
  const [previousSection, setPreviousSection] = useState(nextSection);
  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (nextSection === currentSection) {
      return;
    }

    setPreviousSection(currentSection);
    setCurrentSection(nextSection);
    transition.setValue(0);
    const animation = Animated.timing(transition, {
      duration: transitionMotion.navTheme.duration,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [currentSection, nextSection, transition]);

  const currentPalette = getSectionThemePalette(currentSection);
  const previousLayerOpacity = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={[styles.container, { borderColor: currentPalette.nav.border }]}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: previousLayerOpacity }]}
        >
          <SectionNavLayer section={previousSection} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: transition }]}>
          <SectionNavLayer section={currentSection} />
        </Animated.View>
        <LinearGradient
          colors={figmaV2Reference.tabs.containerGradient.colors}
          end={points.end}
          locations={figmaV2Reference.tabs.containerGradient.locations}
          pointerEvents="none"
          start={points.start}
          style={styles.globalVeil}
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
              <View style={styles.tabContent}>
                <View style={styles.iconBubbleWrap}>
                  {isFocused ? (
                    <View
                      style={[
                        styles.iconBubbleHalo,
                        {
                          borderColor: currentPalette.nav.itemBorder,
                        },
                      ]}
                    />
                  ) : null}
                  {isFocused ? (
                    <LinearGradient
                      colors={currentPalette.nav.itemActive}
                      end={{ x: 1, y: 1 }}
                      start={{ x: 0, y: 0 }}
                      style={styles.iconBubble}
                    >
                      <TabLogo color={currentPalette.nav.iconActive} routeName={route.name} />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconBubble}>
                      <TabLogo color={currentPalette.nav.iconIdle} routeName={route.name} />
                    </View>
                  )}
                </View>
                <Typography
                  color={isFocused ? currentPalette.nav.labelActive : currentPalette.nav.labelIdle}
                  numberOfLines={1}
                  style={styles.label}
                  variant="Caption"
                  weight={isFocused ? 'bold' : 'medium'}
                >
                  {label}
                </Typography>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  globalVeil: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 0,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  iconBubbleHalo: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: radii.pill,
    height: 46,
    opacity: 0.9,
    position: 'absolute',
    width: 46,
  },
  iconBubbleWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    overflow: 'visible',
    width: 46,
  },
  label: {
    textTransform: 'none',
  },
  sectionGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.92,
  },
  sectionOrbLeft: {
    borderRadius: 80,
    bottom: -46,
    height: 90,
    left: -26,
    opacity: 0.26,
    position: 'absolute',
    width: 90,
  },
  sectionOrbRight: {
    borderRadius: 100,
    height: 110,
    opacity: 0.22,
    position: 'absolute',
    right: -24,
    top: -42,
    width: 110,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    shadowOpacity: 0,
  },
  tabContent: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'center',
    width: '100%',
  },
  wrapper: {
    paddingHorizontal: tabBarInsetX,
    paddingTop: spacing.xs,
  },
});
