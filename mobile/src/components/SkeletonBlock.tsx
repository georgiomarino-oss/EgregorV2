import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { feedbackSurface, motion, radii } from '../theme/tokens';

interface SkeletonBlockProps {
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%` | 'auto';
}

export function SkeletonBlock({
  height = 10,
  radius = radii.sm,
  style,
  width = '100%',
}: SkeletonBlockProps) {
  const reduceMotionEnabled = useReducedMotion();
  const pulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      pulse.setValue(0.35);
      return;
    }

    pulse.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: Math.round(motion.durationMs.slow * 1.15),
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: Math.round(motion.durationMs.slow * 1.15),
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse, reduceMotionEnabled]);

  const pulseStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.46, 0.88],
        }),
      };

  return (
    <Animated.View
      style={[
        styles.block,
        {
          backgroundColor: feedbackSurface.loadingSkeletonBase,
          borderRadius: radius,
          height,
          width,
        },
        pulseStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderColor: feedbackSurface.loadingSkeletonGlow,
    borderWidth: 1,
  },
  noMotion: {
    opacity: 0.72,
  },
});

export type { SkeletonBlockProps };
