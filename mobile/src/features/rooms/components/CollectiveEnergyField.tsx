import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  motion,
  roomAtmosphere,
  roomVisualFoundation,
  signatureMoments,
  type CollectiveEnergyLevel,
} from '../../../theme/tokens';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useRoomAtmosphereQuality } from '../hooks/useRoomAtmosphereQuality';

interface CollectiveEnergyFieldProps {
  energyLevel: CollectiveEnergyLevel;
  isLive: boolean;
}

const FIELD_VIEWBOX = 1000;

export function CollectiveEnergyField({ energyLevel, isLive }: CollectiveEnergyFieldProps) {
  const reduceMotionEnabled = useReducedMotion();
  const atmosphereQuality = useRoomAtmosphereQuality();
  const primaryPulse = useMemo(() => new Animated.Value(0), []);
  const secondaryPulse = useMemo(() => new Animated.Value(0), []);
  const depthShift = useMemo(() => new Animated.Value(0), []);
  const nodeOrbit = useMemo(() => new Animated.Value(0), []);

  const preset = roomAtmosphere.collective.energy[energyLevel];
  const liveIntensity =
    energyLevel === 'high' ? motion.amplitude.pronounced : motion.amplitude.medium;
  const mistOpacity = isLive ? 0.92 : roomVisualFoundation.lowPerfStaticOpacity * 0.34;

  useEffect(() => {
    if (!isLive || reduceMotionEnabled || atmosphereQuality === 'static') {
      primaryPulse.stopAnimation();
      secondaryPulse.stopAnimation();
      depthShift.stopAnimation();
      nodeOrbit.stopAnimation();
      primaryPulse.setValue(0);
      secondaryPulse.setValue(0);
      depthShift.setValue(0);
      nodeOrbit.setValue(0);
      return;
    }

    const shouldRenderFullEffects = atmosphereQuality === 'full';
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

    const depthLoop = shouldRenderFullEffects
      ? Animated.loop(
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
        )
      : null;

    const orbitLoop = shouldRenderFullEffects
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(nodeOrbit, {
              duration: 8600,
              easing: Easing.linear,
              toValue: 1,
              useNativeDriver: true,
            }),
          ]),
          { resetBeforeIteration: true },
        )
      : null;

    primaryLoop.start();
    secondaryLoop.start();
    depthLoop?.start();
    orbitLoop?.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      depthLoop?.stop();
      orbitLoop?.stop();
    };
  }, [
    atmosphereQuality,
    depthShift,
    isLive,
    nodeOrbit,
    preset,
    primaryPulse,
    reduceMotionEnabled,
    secondaryPulse,
  ]);

  const primaryOpacity = !isLive
    ? preset.fieldOpacity * 0.09
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
    ? preset.fieldOpacity * 0.06
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
    ? preset.fieldOpacity * 0.05
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

  const orbitRotate = reduceMotionEnabled
    ? '0deg'
    : nodeOrbit.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

  const nodeOpacity = !isLive
    ? 0.28
    : reduceMotionEnabled
      ? 0.54
      : primaryPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.36, 0.74],
        });
  const showFullDepth = atmosphereQuality === 'full';
  const showRing = atmosphereQuality !== 'static';

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
              gradientTransform="translate(488 512) rotate(90) scale(352)"
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
              gradientTransform="translate(518 488) rotate(90) scale(446)"
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

      {showFullDepth ? (
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
                gradientTransform="translate(496 504) rotate(90) scale(520)"
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
      ) : null}

      {showRing ? (
        <Animated.View
          style={[
            styles.collectiveRingWrap,
            {
              opacity: nodeOpacity,
              transform: [{ rotate: orbitRotate }],
            },
          ]}
        >
          <View style={styles.collectiveRingStrong} />
          <View style={styles.collectiveRingSoft} />
          <View style={[styles.presenceNode, styles.presenceNodeA]} />
          <View style={[styles.presenceNode, styles.presenceNodeB]} />
          <View style={[styles.presenceNodeMuted, styles.presenceNodeC]} />
          <View style={[styles.presenceNodeMuted, styles.presenceNodeD]} />
        </Animated.View>
      ) : null}
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
  collectiveRingSoft: {
    borderColor: signatureMoments.collectiveField.ringSoft,
    borderRadius: 110,
    borderWidth: 1,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  collectiveRingStrong: {
    borderColor: signatureMoments.collectiveField.ringStrong,
    borderRadius: 82,
    borderWidth: 1,
    height: 164,
    left: 28,
    position: 'absolute',
    top: 28,
    width: 164,
  },
  collectiveRingWrap: {
    alignSelf: 'center',
    bottom: 124,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  presenceNode: {
    backgroundColor: signatureMoments.collectiveField.presenceNode,
    borderColor: signatureMoments.collectiveField.ringStrong,
    borderRadius: 6,
    borderWidth: 1,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  presenceNodeA: {
    left: 4,
    top: 86,
  },
  presenceNodeB: {
    right: 4,
    top: 114,
  },
  presenceNodeC: {
    bottom: 10,
    left: 90,
  },
  presenceNodeD: {
    right: 80,
    top: 6,
  },
  presenceNodeMuted: {
    backgroundColor: signatureMoments.collectiveField.presenceNodeMuted,
    borderColor: signatureMoments.collectiveField.ringSoft,
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    position: 'absolute',
    width: 10,
  },
});
