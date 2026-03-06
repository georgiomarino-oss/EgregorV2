import { useEffect, useId, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { liveLogoPalette, motion, type LiveLogoContext } from '../theme/tokens';

interface LiveLogoProps {
  accessibilityLabel?: string;
  context?: LiveLogoContext;
  decorative?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const VIEWBOX_SIZE = 1024;

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  root: {
    backgroundColor: 'transparent',
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

type LiveLogoPalette = (typeof liveLogoPalette)[LiveLogoContext];

function BaseLayer({ idPrefix, palette }: { idPrefix: string; palette: LiveLogoPalette }) {
  const coreGradientId = `${idPrefix}-core`;
  const ringGradientId = `${idPrefix}-ring`;

  return (
    <Svg
      height="100%"
      style={styles.svg}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width="100%"
    >
      <Defs>
        <RadialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(512 512) rotate(90) scale(304)"
          gradientUnits="userSpaceOnUse"
          id={coreGradientId}
          r="1"
        >
          <Stop offset="0" stopColor={palette.coreCenter} />
          <Stop offset="0.42" stopColor={palette.coreMid} stopOpacity="0.74" />
          <Stop offset="1" stopColor={palette.ringOuter} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient
          gradientUnits="userSpaceOnUse"
          id={ringGradientId}
          x1="128"
          x2="896"
          y1="128"
          y2="896"
        >
          <Stop offset="0" stopColor={palette.ringFrom} />
          <Stop offset="0.5" stopColor={palette.ringMid} />
          <Stop offset="1" stopColor={palette.ringTo} />
        </LinearGradient>
      </Defs>

      <Circle cx="512" cy="512" fill={`url(#${coreGradientId})`} r="304" />
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="314"
        stroke={palette.ringStroke}
        strokeOpacity="0.64"
        strokeWidth="7"
      />
      <Path
        d="M130 512H894"
        fill="none"
        stroke={palette.crossStroke}
        strokeOpacity="0.44"
        strokeWidth="6"
      />
      <Path
        d="M512 130V894"
        fill="none"
        stroke={palette.crossStroke}
        strokeOpacity="0.34"
        strokeWidth="6"
      />
      <Circle cx="512" cy="512" fill={palette.innerDot} r="36" />
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="70"
        stroke={palette.innerRing}
        strokeOpacity="0.56"
        strokeWidth="4"
      />
    </Svg>
  );
}

function SlowOrbitLayer({ idPrefix, palette }: { idPrefix: string; palette: LiveLogoPalette }) {
  const orbitGradientId = `${idPrefix}-orbit`;

  return (
    <Svg
      height="100%"
      style={styles.svg}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width="100%"
    >
      <Defs>
        <LinearGradient
          gradientUnits="userSpaceOnUse"
          id={orbitGradientId}
          x1="128"
          x2="896"
          y1="128"
          y2="896"
        >
          <Stop offset="0" stopColor={palette.ringFrom} />
          <Stop offset="0.5" stopColor={palette.ringMid} />
          <Stop offset="1" stopColor={palette.ringTo} />
        </LinearGradient>
      </Defs>
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="382"
        stroke={`url(#${orbitGradientId})`}
        strokeOpacity="0.92"
        strokeWidth="10"
      />
      <Circle cx="894" cy="512" fill={palette.orbitPrimary} r="18" />
      <Circle cx="512" cy="130" fill={palette.orbitSecondary} r="17" />
      <Circle cx="326" cy="840" fill={palette.orbitTertiary} r="16" />
    </Svg>
  );
}

function FastOrbitLayer({ palette }: { palette: LiveLogoPalette }) {
  return (
    <Svg
      height="100%"
      style={styles.svg}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width="100%"
    >
      <Ellipse
        cx="512"
        cy="512"
        fill="none"
        rx="330"
        ry="210"
        stroke={palette.ellipseStroke}
        strokeOpacity="0.54"
        strokeWidth="6"
      />
      <Circle cx="770" cy="649" fill={palette.orbitSecondary} r="15" />
      <Circle cx="261" cy="390" fill={palette.orbitTertiary} r="14" />
    </Svg>
  );
}

export function LiveLogo({
  accessibilityLabel = 'Live',
  context = 'default',
  decorative = true,
  size = 86,
  style,
}: LiveLogoProps) {
  const reduceMotionEnabled = useReducedMotion();
  const palette = liveLogoPalette[context] ?? liveLogoPalette.default;
  const svgId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientIdPrefix = `live-logo-${context}-${svgId}`;
  const slowSpin = useMemo(() => new Animated.Value(0), []);
  const fastSpin = useMemo(() => new Animated.Value(0), []);
  const pulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      slowSpin.setValue(0);
      fastSpin.setValue(0);
      pulse.setValue(0);
      return;
    }

    const slowLoop = Animated.loop(
      Animated.timing(slowSpin, {
        duration: motion.liveLogo.slowOrbitMs,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );

    const fastLoop = Animated.loop(
      Animated.timing(fastSpin, {
        duration: motion.liveLogo.fastOrbitMs,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: motion.liveLogo.pulseMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: motion.liveLogo.pulseMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    slowLoop.start();
    fastLoop.start();
    pulseLoop.start();

    return () => {
      slowLoop.stop();
      fastLoop.stop();
      pulseLoop.stop();
    };
  }, [fastSpin, pulse, reduceMotionEnabled, slowSpin]);

  const slowRotation = slowSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fastRotation = fastSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1 + motion.amplitude.medium],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.84, 1, 0.84],
  });
  const pulseGradientId = `${gradientIdPrefix}-pulse`;

  return (
    <View
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[styles.root, { height: size, width: size }, style]}
    >
      <BaseLayer idPrefix={gradientIdPrefix} palette={palette} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <Svg
          height="100%"
          style={styles.svg}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          width="100%"
        >
          <Defs>
            <RadialGradient
              cx="0"
              cy="0"
              gradientTransform="translate(512 512) rotate(90) scale(304)"
              gradientUnits="userSpaceOnUse"
              id={pulseGradientId}
              r="1"
            >
              <Stop offset="0" stopColor={palette.coreCenter} />
              <Stop offset="0.42" stopColor={palette.coreMid} stopOpacity="0.74" />
              <Stop offset="1" stopColor={palette.ringOuter} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="512" cy="512" fill={`url(#${pulseGradientId})`} r="304" />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ rotate: slowRotation }] }]}
      >
        <SlowOrbitLayer idPrefix={gradientIdPrefix} palette={palette} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ rotate: fastRotation }] }]}
      >
        <FastOrbitLayer palette={palette} />
      </Animated.View>
    </View>
  );
}
