import { useEffect, useMemo } from 'react';
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

interface LiveLogoProps {
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

function BaseLayer() {
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
          id="core-live"
          r="1"
        >
          <Stop offset="0" stopColor="#FFDCA6" />
          <Stop offset="0.42" stopColor="#9DE8FF" stopOpacity="0.74" />
          <Stop offset="1" stopColor="#9DE8FF" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient
          gradientUnits="userSpaceOnUse"
          id="ring-grad"
          x1="128"
          x2="896"
          y1="128"
          y2="896"
        >
          <Stop offset="0" stopColor="#5DE1C2" />
          <Stop offset="0.5" stopColor="#89D8FF" />
          <Stop offset="1" stopColor="#FFDCA6" />
        </LinearGradient>
      </Defs>

      <Circle cx="512" cy="512" fill="url(#core-live)" r="304" />
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="314"
        stroke="#A9E8FF"
        strokeOpacity="0.64"
        strokeWidth="7"
      />
      <Path d="M130 512H894" fill="none" stroke="#AEE8FF" strokeOpacity="0.44" strokeWidth="6" />
      <Path d="M512 130V894" fill="none" stroke="#AEE8FF" strokeOpacity="0.34" strokeWidth="6" />
      <Circle cx="512" cy="512" fill="#FFF2DE" r="36" />
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="70"
        stroke="#FFDCA6"
        strokeOpacity="0.56"
        strokeWidth="4"
      />
    </Svg>
  );
}

function SlowOrbitLayer() {
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
          id="ring-grad-orbit"
          x1="128"
          x2="896"
          y1="128"
          y2="896"
        >
          <Stop offset="0" stopColor="#5DE1C2" />
          <Stop offset="0.5" stopColor="#89D8FF" />
          <Stop offset="1" stopColor="#FFDCA6" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="512"
        cy="512"
        fill="none"
        r="382"
        stroke="url(#ring-grad-orbit)"
        strokeOpacity="0.92"
        strokeWidth="10"
      />
      <Circle cx="894" cy="512" fill="#5DE1C2" r="18" />
      <Circle cx="512" cy="130" fill="#89D8FF" r="17" />
      <Circle cx="326" cy="840" fill="#FFBF6B" r="16" />
    </Svg>
  );
}

function FastOrbitLayer() {
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
        stroke="#FFDCA6"
        strokeOpacity="0.54"
        strokeWidth="6"
      />
      <Circle cx="770" cy="649" fill="#89D8FF" r="15" />
      <Circle cx="261" cy="390" fill="#FFBF6B" r="14" />
    </Svg>
  );
}

export function LiveLogo({ size = 86, style }: LiveLogoProps) {
  const slowSpin = useMemo(() => new Animated.Value(0), []);
  const fastSpin = useMemo(() => new Animated.Value(0), []);
  const pulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const slowLoop = Animated.loop(
      Animated.timing(slowSpin, {
        duration: 16000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );

    const fastLoop = Animated.loop(
      Animated.timing(fastSpin, {
        duration: 7000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1200,
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
  }, [fastSpin, pulse, slowSpin]);

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
    outputRange: [1, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.84, 1, 0.84],
  });

  return (
    <View style={[styles.root, { height: size, width: size }, style]}>
      <BaseLayer />

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
              id="pulse-core"
              r="1"
            >
              <Stop offset="0" stopColor="#FFDCA6" />
              <Stop offset="0.42" stopColor="#9DE8FF" stopOpacity="0.74" />
              <Stop offset="1" stopColor="#9DE8FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="512" cy="512" fill="url(#pulse-core)" r="304" />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ rotate: slowRotation }] }]}
      >
        <SlowOrbitLayer />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ rotate: fastRotation }] }]}
      >
        <FastOrbitLayer />
      </Animated.View>
    </View>
  );
}
