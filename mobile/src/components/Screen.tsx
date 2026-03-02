import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_PAD_X } from '../theme/figmaV2Layout';
import { CUSTOM_TAB_BAR_HEIGHT } from '../theme/layout';
import { CosmicBackground } from './CosmicBackground';

type CosmicBackgroundVariant = 'auth' | 'home' | 'solo' | 'events' | 'eventRoom' | 'profile';

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

  const basePadding = {
    paddingBottom: insets.bottom + (withTabBarInset ? CUSTOM_TAB_BAR_HEIGHT : 0),
    paddingHorizontal: SCREEN_PAD_X,
    paddingTop: insets.top + topOffset,
  };

  return (
    <CosmicBackground ambientSource={ambientSource} variant={variant}>
      {scrollable ? (
        <ScrollView {...scrollProps} contentContainerStyle={[basePadding, contentContainerStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, basePadding, contentContainerStyle]}>{children}</View>
      )}
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
