import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { motion, roomAtmosphere, roomVisualFoundation, signatureMoments } from '../../../theme/tokens';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useRoomAtmosphereQuality } from '../hooks/useRoomAtmosphereQuality';

interface SoloAuraFieldProps {
  active?: boolean;
  mode?: 'host' | 'participant' | 'solo';
}

const FIELD_VIEWBOX = 1000;

export function SoloAuraField({ active = true, mode = 'solo' }: SoloAuraFieldProps) {
  const reduceMotionEnabled = useReducedMotion();
  const atmosphereQuality = useRoomAtmosphereQuality();
  const breathe = useMemo(() => new Animated.Value(0), []);
  const drift = useMemo(() => new Animated.Value(0), []);
  const syncWave = useMemo(() => new Animated.Value(0), []);
  const mistOpacity = active ? 1 : roomVisualFoundation.lowPerfStaticOpacity;

  useEffect(() => {
    if (!active || reduceMotionEnabled || atmosphereQuality === 'static') {
      breathe.stopAnimation();
      drift.stopAnimation();
      syncWave.stopAnimation();
      breathe.setValue(0);
      drift.setValue(0);
      syncWave.setValue(0);
      return;
    }

    const shouldRenderFullEffects = atmosphereQuality === 'full';
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

    const driftLoop = shouldRenderFullEffects
      ? Animated.loop(
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
        )
      : null;

    const syncLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(syncWave, {
          duration: motion.durationMs.ritual,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(syncWave, {
          duration: motion.durationMs.ritual,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    loop.start();
    driftLoop?.start();
    syncLoop.start();

    return () => {
      loop.stop();
      driftLoop?.stop();
      syncLoop.stop();
    };
  }, [active, atmosphereQuality, breathe, drift, reduceMotionEnabled, syncWave]);

  const auraOpacity = !active
    ? 0.16
    : reduceMotionEnabled
      ? 0.34
      : breathe.interpolate({
          inputRange: [0, 1],
          outputRange: [0.24, 0.5],
        });

  const auraScale = !active
    ? 1.01
    : reduceMotionEnabled
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

  const veilOpacity = !active
    ? 0.08
    : reduceMotionEnabled
      ? 0.22
      : drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0.12, 0.24],
        });

  const innerGlowOpacity = !active
    ? 0.12
    : reduceMotionEnabled
      ? 0.28
      : breathe.interpolate({
          inputRange: [0, 1],
          outputRange: [0.18, 0.34],
        });

  const syncOpacity = !active
    ? 0.16
    : reduceMotionEnabled
      ? 0.56
      : syncWave.interpolate({
          inputRange: [0, 1],
          outputRange: [0.34, 0.72],
        });

  const syncScale = reduceMotionEnabled
    ? 1
    : syncWave.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1.04],
      });

  const hostBeaconOpacity = !active
    ? 0.12
    : reduceMotionEnabled
      ? 0.4
      : syncWave.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 0.56],
        });
  const showFullDetail = atmosphereQuality === 'full';
  const showSyncOverlay = mode === 'participant' && atmosphereQuality !== 'static';
  const showHostBeacon = mode === 'host' && atmosphereQuality !== 'static';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[roomAtmosphere.solo.mistFrom, roomAtmosphere.solo.mistTo]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={[StyleSheet.absoluteFill, { opacity: mistOpacity }]}
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

      {showFullDetail ? (
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
      ) : null}

      <Animated.View style={[styles.innerGlow, { opacity: innerGlowOpacity }]} />

      {showSyncOverlay ? (
        <Animated.View
          style={[styles.syncOverlay, { opacity: syncOpacity, transform: [{ scale: syncScale }] }]}
        >
          <View style={styles.syncNodeHost} />
          <View style={styles.syncTether} />
          <View style={styles.syncWave} />
          <View style={styles.syncNodeParticipant} />
        </Animated.View>
      ) : null}

      {showHostBeacon ? (
        <Animated.View style={[styles.hostBeacon, { opacity: hostBeaconOpacity }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerAura: {
    ...StyleSheet.absoluteFillObject,
  },
  hostBeacon: {
    alignSelf: 'center',
    backgroundColor: signatureMoments.collectiveField.stageGlow,
    borderColor: signatureMoments.sharedSync.wave,
    borderRadius: 120,
    borderWidth: 1,
    bottom: 192,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: roomAtmosphere.solo.mistFrom,
  },
  syncNodeHost: {
    backgroundColor: signatureMoments.sharedSync.hostNode,
    borderColor: signatureMoments.sharedSync.wave,
    borderRadius: 37,
    borderWidth: 1,
    height: 74,
    left: 52,
    position: 'absolute',
    top: 40,
    width: 74,
  },
  syncNodeParticipant: {
    backgroundColor: signatureMoments.sharedSync.participantNode,
    borderColor: signatureMoments.sharedSync.tetherCore,
    borderRadius: 37,
    borderWidth: 1,
    bottom: 38,
    height: 74,
    position: 'absolute',
    right: 52,
    width: 74,
  },
  syncOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  syncTether: {
    backgroundColor: signatureMoments.sharedSync.tetherGlow,
    borderRadius: 8,
    height: 10,
    left: 110,
    position: 'absolute',
    top: 152,
    transform: [{ rotate: '-29deg' }],
    width: 170,
  },
  syncWave: {
    borderColor: signatureMoments.sharedSync.wave,
    borderRadius: 92,
    borderWidth: 1,
    height: 184,
    left: 88,
    position: 'absolute',
    top: 108,
    width: 184,
  },
  veilAura: {
    ...StyleSheet.absoluteFillObject,
  },
});
