import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { roomVisualFoundation, sectionVisualThemes } from '../../../theme/tokens';
import {
  useRoomAtmosphereQuality,
  type RoomAtmosphereQuality,
} from '../hooks/useRoomAtmosphereQuality';

interface RoomAtmosphereBackdropProps {
  mode: 'live' | 'solo';
  quality?: RoomAtmosphereQuality;
}

export function RoomAtmosphereBackdrop({ mode, quality }: RoomAtmosphereBackdropProps) {
  const detectedQuality = useRoomAtmosphereQuality();
  const resolvedQuality = quality ?? detectedQuality;
  const drift = useMemo(() => new Animated.Value(0), []);
  const shimmer = useMemo(() => new Animated.Value(0), []);
  const soloTheme = sectionVisualThemes.solo;
  const liveTheme = sectionVisualThemes.live;
  const palette = mode === 'solo' ? soloTheme : liveTheme;
  const scrim =
    mode === 'solo'
      ? roomVisualFoundation.readabilityScrim.solo
      : roomVisualFoundation.readabilityScrim.live;

  useEffect(() => {
    if (resolvedQuality !== 'full') {
      drift.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
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
  }, [drift, resolvedQuality]);

  useEffect(() => {
    if (resolvedQuality !== 'full') {
      shimmer.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          duration: 6400,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          duration: 6400,
          easing: Easing.inOut(Easing.sin),
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
  }, [resolvedQuality, shimmer]);

  const driftTranslateY =
    resolvedQuality === 'full'
      ? drift.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [2, -2, 2],
        })
      : 0;
  const reverseDriftTranslateY =
    resolvedQuality === 'full'
      ? drift.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-2, 2, -2],
        })
      : 0;

  const staticOpacity =
    resolvedQuality === 'static' ? roomVisualFoundation.lowPerfStaticOpacity : 1;
  const sweepTranslateX =
    resolvedQuality === 'full'
      ? shimmer.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-18, 20, -18],
        })
      : 0;
  const sweepOpacity =
    resolvedQuality === 'full'
      ? shimmer.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.14, 0.24, 0.14],
        })
      : 0;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={palette.background.veil}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.92 * staticOpacity }]}
      />
      <LinearGradient
        colors={palette.surface.hero}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.26 * staticOpacity }]}
      />
      <Animated.View
        style={[
          styles.lightOrbPrimary,
          {
            backgroundColor: palette.background.orbA,
            opacity: 0.58 * staticOpacity,
            transform: [{ translateY: driftTranslateY }],
          },
        ]}
      />
      <View
        style={[
          styles.horizonBloom,
          {
            backgroundColor: palette.surface.halo,
            opacity: (resolvedQuality === 'static' ? 0.12 : 0.2) * staticOpacity,
          },
        ]}
      />
      <View
        style={[
          styles.edgeBandLeft,
          {
            backgroundColor: palette.background.orbA,
            opacity: (resolvedQuality === 'static' ? 0.08 : 0.16) * staticOpacity,
          },
        ]}
      />
      <View
        style={[
          styles.edgeBandRight,
          {
            backgroundColor: palette.background.orbB,
            opacity: (resolvedQuality === 'static' ? 0.08 : 0.16) * staticOpacity,
          },
        ]}
      />
      {resolvedQuality === 'full' ? (
        <>
          <Animated.View
            style={[
              styles.lightOrbSecondary,
              {
                backgroundColor: palette.background.orbB,
                opacity: 0.42,
                transform: [{ translateY: reverseDriftTranslateY }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sweepBeam,
              {
                borderColor: palette.surface.edge,
                opacity: sweepOpacity,
                transform: [{ translateX: sweepTranslateX }],
              },
            ]}
          />
        </>
      ) : resolvedQuality === 'balanced' ? (
        <View
          style={[
            styles.sweepBeam,
            styles.sweepBeamStatic,
            {
              borderColor: palette.surface.edge,
              opacity: 0.14,
            },
          ]}
        />
      ) : null}
      {resolvedQuality !== 'static' ? (
        <View
          style={[
            styles.stardustLayer,
            {
              backgroundColor: palette.surface.highlight,
              opacity: 0.03,
            },
          ]}
        />
      ) : null}
      <LinearGradient
        colors={[scrim.from, scrim.to]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edgeBandLeft: {
    borderRadius: 210,
    height: 280,
    left: -130,
    position: 'absolute',
    top: 100,
    width: 240,
  },
  edgeBandRight: {
    borderRadius: 210,
    bottom: 70,
    height: 260,
    position: 'absolute',
    right: -120,
    width: 230,
  },
  horizonBloom: {
    borderRadius: 260,
    bottom: -40,
    height: 220,
    left: 40,
    position: 'absolute',
    right: 40,
  },
  lightOrbPrimary: {
    borderRadius: 180,
    height: 280,
    position: 'absolute',
    right: -80,
    top: -70,
    width: 280,
  },
  lightOrbSecondary: {
    borderRadius: 150,
    bottom: 20,
    height: 220,
    left: -80,
    position: 'absolute',
    width: 220,
  },
  stardustLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sweepBeam: {
    alignSelf: 'center',
    borderRadius: 240,
    borderWidth: 1,
    height: 250,
    position: 'absolute',
    top: 80,
    width: 250,
  },
  sweepBeamStatic: {
    top: 92,
  },
});