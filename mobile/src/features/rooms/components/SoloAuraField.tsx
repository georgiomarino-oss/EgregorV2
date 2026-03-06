import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { motion, roomAtmosphere } from '../../../theme/tokens';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface SoloAuraFieldProps {
  active?: boolean;
}

const FIELD_VIEWBOX = 1000;

export function SoloAuraField({ active = true }: SoloAuraFieldProps) {
  const reduceMotionEnabled = useReducedMotion();
  const breathe = useMemo(() => new Animated.Value(0), []);
  const drift = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!active || reduceMotionEnabled) {
      breathe.stopAnimation();
      drift.stopAnimation();
      breathe.setValue(0);
      drift.setValue(0);
      return;
    }

    const breathHalfCycle = Math.max(
      motion.durationMs.slow,
      Math.floor(motion.room.solo.breathCycleMs / 2),
    );
    const driftHalfCycle = Math.max(
      motion.durationMs.slow,
      Math.floor(motion.room.solo.driftCycleMs / 2),
    );

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          duration: breathHalfCycle,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          duration: breathHalfCycle,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          duration: driftHalfCycle,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          duration: driftHalfCycle,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    loop.start();
    driftLoop.start();

    return () => {
      loop.stop();
      driftLoop.stop();
    };
  }, [active, breathe, drift, reduceMotionEnabled]);

  const auraOpacity = reduceMotionEnabled
    ? 0.34
    : breathe.interpolate({
        inputRange: [0, 1],
        outputRange: [0.24, 0.5],
      });

  const auraScale = reduceMotionEnabled
    ? 1.01
    : breathe.interpolate({
        inputRange: [0, 1],
        outputRange: [1 - motion.amplitude.subtle, 1 + motion.amplitude.subtle * 1.5],
      });

  const auraTranslateY = reduceMotionEnabled
    ? 0
    : drift.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, -1.6, 1],
      });

  const veilOpacity = reduceMotionEnabled
    ? 0.22
    : drift.interpolate({
        inputRange: [0, 1],
        outputRange: [0.12, 0.24],
      });

  const innerGlowOpacity = reduceMotionEnabled
    ? 0.28
    : breathe.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.34],
      });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[roomAtmosphere.solo.mistFrom, roomAtmosphere.solo.mistTo]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.centerAura,
          {
            opacity: auraOpacity,
            transform: [{ scale: auraScale }, { translateY: auraTranslateY }],
          },
        ]}
      >
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox={`0 0 ${FIELD_VIEWBOX} ${FIELD_VIEWBOX}`}
          width="100%"
        >
          <Defs>
            <RadialGradient
              cx="0"
              cy="0"
              gradientTransform="translate(500 520) rotate(90) scale(260)"
              gradientUnits="userSpaceOnUse"
              id="solo-aura-core"
              r="1"
            >
              <Stop offset="0" stopColor={roomAtmosphere.solo.auraInner} />
              <Stop offset="0.58" stopColor={roomAtmosphere.solo.auraOuter} />
              <Stop offset="1" stopColor={roomAtmosphere.solo.mistTo} />
            </RadialGradient>
          </Defs>

          <Rect
            fill="url(#solo-aura-core)"
            height={FIELD_VIEWBOX}
            width={FIELD_VIEWBOX}
            x="0"
            y="0"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.veilAura,
          {
            opacity: veilOpacity,
            transform: [{ scale: 1 + motion.amplitude.medium }],
          },
        ]}
      >
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox={`0 0 ${FIELD_VIEWBOX} ${FIELD_VIEWBOX}`}
          width="100%"
        >
          <Defs>
            <RadialGradient
              cx="0"
              cy="0"
              gradientTransform="translate(500 520) rotate(90) scale(360)"
              gradientUnits="userSpaceOnUse"
              id="solo-aura-veil"
              r="1"
            >
              <Stop offset="0" stopColor={roomAtmosphere.solo.auraOuter} />
              <Stop offset="1" stopColor={roomAtmosphere.solo.mistTo} />
            </RadialGradient>
          </Defs>

          <Rect
            fill="url(#solo-aura-veil)"
            height={FIELD_VIEWBOX}
            width={FIELD_VIEWBOX}
            x="0"
            y="0"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.innerGlow, { opacity: innerGlowOpacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  centerAura: {
    ...StyleSheet.absoluteFillObject,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: roomAtmosphere.solo.mistFrom,
  },
  veilAura: {
    ...StyleSheet.absoluteFillObject,
  },
});
