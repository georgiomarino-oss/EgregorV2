import type { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_PAD_X } from '../theme/figmaV2Layout';
import {
  CUSTOM_TAB_BAR_HEIGHT,
  SCREEN_SAFE_BOTTOM_EXTRA,
  SCREEN_SAFE_TOP_EXTRA,
} from '../theme/layout';
import { CosmicBackground } from './CosmicBackground';

type CosmicBackgroundVariant =
  | 'auth'
  | 'home'
  | 'circles'
  | 'solo'
  | 'events'
  | 'live'
  | 'eventRoom'
  | 'profile';

interface ScreenProps {
  ambientSource?: unknown;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  scrollable?: boolean;
  topOffset?: number;
  variant?: CosmicBackgroundVariant;
  withTabBarInset?: boolean;
}

export function Screen({
  ambientSource,
  children,
  contentContainerStyle,
  scrollProps,
  scrollable = true,
  topOffset = 0,
  variant = 'home',
  withTabBarInset = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const androidStatusBarInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const resolvedTopInset = Math.max(insets.top, androidStatusBarInset);
  const resolvedBottomInset = Math.max(insets.bottom, 0);
  const toNumericPadding = (value: unknown) => (typeof value === 'number' ? value : 0);

  const flattenedContainerStyle = StyleSheet.flatten(contentContainerStyle) ?? {};
  const {
    padding,
    paddingBottom,
    paddingHorizontal,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingVertical,
    ...restContainerStyle
  } = flattenedContainerStyle;

  const sharedPadding = toNumericPadding(padding);
  const verticalPadding = toNumericPadding(paddingVertical);
  const horizontalPadding = toNumericPadding(paddingHorizontal);

  const topPadding = sharedPadding + verticalPadding + toNumericPadding(paddingTop);
  const bottomPadding = sharedPadding + verticalPadding + toNumericPadding(paddingBottom);
  const sidePadding = sharedPadding + horizontalPadding;
  const leftPadding = sidePadding + toNumericPadding(paddingLeft);
  const rightPadding = sidePadding + toNumericPadding(paddingRight);

  const mergedContainerStyle: ViewStyle = {
    ...restContainerStyle,
    paddingBottom:
      resolvedBottomInset +
      (withTabBarInset ? CUSTOM_TAB_BAR_HEIGHT : 0) +
      SCREEN_SAFE_BOTTOM_EXTRA +
      bottomPadding,
    paddingLeft: SCREEN_PAD_X + leftPadding,
    paddingRight: SCREEN_PAD_X + rightPadding,
    paddingTop: resolvedTopInset + SCREEN_SAFE_TOP_EXTRA + topOffset + topPadding,
  };

  return (
    <CosmicBackground ambientSource={ambientSource} variant={variant}>
      {scrollable ? (
        <ScrollView
          {...scrollProps}
          contentContainerStyle={mergedContainerStyle}
          contentInsetAdjustmentBehavior="always"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, mergedContainerStyle]}>{children}</View>
      )}
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
