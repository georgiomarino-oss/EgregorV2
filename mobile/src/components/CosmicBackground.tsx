import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import LottieView, { type AnimationObject } from 'lottie-react-native';

import { colors } from '../lib/theme/tokens';

interface CosmicBackgroundProps {
  ambientSource?: AnimationObject | { uri: string } | string;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  useAmbient?: boolean;
}

export function CosmicBackground({
  ambientSource,
  children,
  contentStyle,
  useAmbient = true,
}: CosmicBackgroundProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundTop, '#0e1530', colors.backgroundBottom]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.glow, styles.glowPrimary]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowSecondary]} />

      {useAmbient && ambientSource ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LottieView autoPlay loop source={ambientSource} style={styles.ambient} />
        </View>
      ) : null}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    flex: 1,
    opacity: 0.2,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  glow: {
    borderRadius: 999,
    height: 280,
    opacity: 0.3,
    position: 'absolute',
    width: 280,
  },
  glowPrimary: {
    backgroundColor: colors.auroraPrimary,
    left: -70,
    top: -50,
  },
  glowSecondary: {
    backgroundColor: colors.auroraSecondary,
    bottom: -80,
    right: -40,
  },
});
