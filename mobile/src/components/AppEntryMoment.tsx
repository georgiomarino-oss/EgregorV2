import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { motion, radii, signatureMoments, spacing } from '../theme/tokens';
import { LiveLogo } from './LiveLogo';
import { Typography } from './Typography';

interface AppEntryMomentProps {
  subtitle: string;
  title: string;
  status?: string;
}

const VIEWBOX = 1000;

export function AppEntryMoment({ status, subtitle, title }: AppEntryMomentProps) {
  const reduceMotionEnabled = useReducedMotion();
  const beamPulse = useMemo(() => new Animated.Value(0), []);
  const beamDrift = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      beamPulse.setValue(1);
      beamDrift.setValue(0);
      return;
    }

    beamPulse.setValue(0);
    beamDrift.setValue(0);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamPulse, {
          duration: motion.durationMs.ritual,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(beamPulse, {
          duration: motion.durationMs.ritual,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamDrift, {
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(beamDrift, {
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    pulseLoop.start();
    driftLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [beamDrift, beamPulse, reduceMotionEnabled]);

  const beamOpacity = reduceMotionEnabled
    ? signatureMoments.fallback.lowEndStaticOpacity
    : beamPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.44, 0.8],
      });

  const portalScale = reduceMotionEnabled
    ? 1
    : beamPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
      });

  const beamTranslateY = reduceMotionEnabled
    ? signatureMoments.fallback.reducedMotionDriftPx
    : beamDrift.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [2, -2, 2],
      });

  return (
    <View style={styles.container}>
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.beamWrap,
          { opacity: beamOpacity, transform: [{ translateY: beamTranslateY }] },
        ]}
      >
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          width="100%"
        >
          <Defs>
            <SvgLinearGradient
              id="entry-beam"
              x1="500"
              x2="500"
              y1="0"
              y2={VIEWBOX.toString()}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={signatureMoments.appEntry.beamOuter} />
              <Stop offset="0.2" stopColor={signatureMoments.appEntry.beamGlow} />
              <Stop offset="0.58" stopColor={signatureMoments.appEntry.beamCore} />
              <Stop offset="1" stopColor={signatureMoments.appEntry.beamOuter} />
            </SvgLinearGradient>
            <RadialGradient
              id="entry-portal"
              cx="0"
              cy="0"
              gradientTransform="translate(500 690) rotate(90) scale(188)"
              gradientUnits="userSpaceOnUse"
              r="1"
            >
              <Stop offset="0" stopColor={signatureMoments.appEntry.portalCore} />
              <Stop offset="0.48" stopColor={signatureMoments.appEntry.portalRing} />
              <Stop offset="1" stopColor={signatureMoments.appEntry.beamOuter} />
            </RadialGradient>
          </Defs>

          <Rect fill="url(#entry-beam)" height={VIEWBOX} width={VIEWBOX} x="0" y="0" />
          <Rect fill="url(#entry-portal)" height={VIEWBOX} width={VIEWBOX} x="0" y="0" />
        </Svg>
      </Animated.View>

      <View style={styles.centerStack}>
        <Animated.View
          style={[
            styles.portalCore,
            {
              transform: [{ scale: portalScale }],
            },
          ]}
        />

        <View style={styles.card}>
          <View style={styles.invocationBadge}>
            <Typography
              color={signatureMoments.appEntry.statusText}
              style={styles.invocationBadgeText}
              variant="Caption"
              weight="bold"
            >
              Invocation
            </Typography>
          </View>
          <LiveLogo context="eventRoom" size={40} />
          <Typography style={styles.title} variant="H1" weight="bold">
            {title}
          </Typography>
          <Typography
            color={signatureMoments.appEntry.statusText}
            style={styles.subtitle}
            variant="Body"
          >
            {subtitle}
          </Typography>
          {status ? (
            <Typography
              color={signatureMoments.appEntry.statusText}
              style={styles.status}
              variant="Caption"
              weight="bold"
            >
              {status}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  beamWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    alignItems: 'center',
    backgroundColor: signatureMoments.appEntry.panelBackground,
    borderColor: signatureMoments.appEntry.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    maxWidth: 360,
    minWidth: 280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  centerStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  container: {
    backgroundColor: signatureMoments.appEntry.baseBackground,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  invocationBadge: {
    alignItems: 'center',
    backgroundColor: signatureMoments.appEntry.portalRing,
    borderColor: signatureMoments.appEntry.beamCore,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 106,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  invocationBadgeText: {
    textTransform: 'none',
  },
  portalCore: {
    backgroundColor: signatureMoments.appEntry.invocationGlow,
    borderColor: signatureMoments.appEntry.portalRing,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 128,
    width: 128,
  },
  status: {
    letterSpacing: 0.32,
    textTransform: 'none',
  },
  subtitle: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
  },
});

export type { AppEntryMomentProps };
