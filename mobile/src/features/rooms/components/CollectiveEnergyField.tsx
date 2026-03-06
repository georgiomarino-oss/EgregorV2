import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { motion, roomAtmosphere, type CollectiveEnergyLevel } from '../../../theme/tokens';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface CollectiveEnergyFieldProps {
  energyLevel: CollectiveEnergyLevel;
  isLive: boolean;
}

const FIELD_VIEWBOX = 1000;

export function CollectiveEnergyField({ energyLevel, isLive }: CollectiveEnergyFieldProps) {
  const reduceMotionEnabled = useReducedMotion();
  const primaryPulse = useMemo(() => new Animated.Value(0), []);
  const secondaryPulse = useMemo(() => new Animated.Value(0), []);
  const depthShift = useMemo(() => new Animated.Value(0), []);

  const preset = roomAtmosphere.collective.energy[energyLevel];
  const liveIntensity =
    energyLevel === 'high' ? motion.amplitude.pronounced : motion.amplitude.medium;
  const mistOpacity = isLive ? 1 : 0.36;

  useEffect(() => {
    if (!isLive || reduceMotionEnabled) {
      primaryPulse.stopAnimation();
      secondaryPulse.stopAnimation();
      depthShift.stopAnimation();
      primaryPulse.setValue(0);
      secondaryPulse.setValue(0);
      depthShift.setValue(0);
      return;
    }

    const primaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(primaryPulse, {
          duration: preset.pulseDurationMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(primaryPulse, {
          duration: preset.pulseDurationMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const secondaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(secondaryPulse, {
          duration: preset.secondaryPulseDurationMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(secondaryPulse, {
          duration: preset.secondaryPulseDurationMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const depthLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(depthShift, {
          duration: motion.room.collective.depthCycleMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(depthShift, {
          duration: motion.room.collective.depthCycleMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    primaryLoop.start();
    secondaryLoop.start();
    depthLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      depthLoop.stop();
    };
  }, [depthShift, isLive, preset, primaryPulse, reduceMotionEnabled, secondaryPulse]);

  const primaryOpacity = !isLive
    ? preset.fieldOpacity * 0.14
    : reduceMotionEnabled
      ? preset.fieldOpacity * 0.7
      : primaryPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [preset.fieldOpacity * 0.52, preset.fieldOpacity * 1.04],
        });

  const primaryScale = !isLive
    ? 1.01
    : reduceMotionEnabled
      ? 1.04
      : primaryPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, preset.auraScale + liveIntensity * 0.5],
        });

  const secondaryOpacity = !isLive
    ? preset.fieldOpacity * 0.1
    : reduceMotionEnabled
      ? preset.fieldOpacity * 0.48
      : secondaryPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [preset.fieldOpacity * 0.3, preset.fieldOpacity * 0.76],
        });

  const secondaryScale = !isLive
    ? 1.02
    : reduceMotionEnabled
      ? 1.08
      : secondaryPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1.03, preset.auraScale + 0.14 + liveIntensity * 0.6],
        });

  const depthOpacity = !isLive
    ? preset.fieldOpacity * 0.08
    : reduceMotionEnabled
      ? preset.fieldOpacity * 0.34
      : depthShift.interpolate({
          inputRange: [0, 1],
          outputRange: [preset.fieldOpacity * 0.2, preset.fieldOpacity * 0.44],
        });

  const depthTranslateY = reduceMotionEnabled
    ? 0
    : depthShift.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [2, -2.4, 2],
      });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[roomAtmosphere.collective.mistFrom, roomAtmosphere.collective.mistTo]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={[StyleSheet.absoluteFill, { opacity: mistOpacity }]}
      />

      <Animated.View
        style={[
          styles.energyLayer,
          {
            opacity: primaryOpacity,
            transform: [{ scale: primaryScale }],
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
              gradientTransform="translate(500 500) rotate(90) scale(325)"
              gradientUnits="userSpaceOnUse"
              id="collective-energy-core"
              r="1"
            >
              <Stop offset="0" stopColor={roomAtmosphere.collective.auraInner} />
              <Stop offset="0.5" stopColor={roomAtmosphere.collective.auraOuter} />
              <Stop offset="1" stopColor={roomAtmosphere.collective.mistTo} />
            </RadialGradient>
          </Defs>

          <Rect
            fill="url(#collective-energy-core)"
            height={FIELD_VIEWBOX}
            width={FIELD_VIEWBOX}
            x="0"
            y="0"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.energyLayer,
          {
            opacity: secondaryOpacity,
            transform: [{ scale: secondaryScale }, { translateY: depthTranslateY }],
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
              gradientTransform="translate(500 500) rotate(90) scale(410)"
              gradientUnits="userSpaceOnUse"
              id="collective-energy-halo"
              r="1"
            >
              <Stop offset="0" stopColor={roomAtmosphere.collective.auraOuter} />
              <Stop offset="1" stopColor={roomAtmosphere.collective.mistTo} />
            </RadialGradient>
          </Defs>

          <Rect
            fill="url(#collective-energy-halo)"
            height={FIELD_VIEWBOX}
            width={FIELD_VIEWBOX}
            x="0"
            y="0"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.depthLayer, { opacity: depthOpacity }]}>
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
              gradientTransform="translate(500 500) rotate(90) scale(460)"
              gradientUnits="userSpaceOnUse"
              id="collective-energy-depth"
              r="1"
            >
              <Stop offset="0" stopColor={roomAtmosphere.collective.auraOuter} />
              <Stop offset="1" stopColor={roomAtmosphere.collective.mistTo} />
            </RadialGradient>
          </Defs>

          <Rect
            fill="url(#collective-energy-depth)"
            height={FIELD_VIEWBOX}
            width={FIELD_VIEWBOX}
            x="0"
            y="0"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  depthLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  energyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
