import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { handoffSurface, motion, radii, spacing } from '../../../theme/tokens';

interface SoloSetupHeroProps {
  intention: string;
  loading: boolean;
  sessionsToday: number;
}

export function SoloSetupHero({ intention, loading, sessionsToday }: SoloSetupHeroProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.durationMs.ritual,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, settle]);

  const palette = handoffSurface.soloSetup.hero;
  const settleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: settle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.84, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={settleStyle}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: palette.panelBackground,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[palette.panelGradientFrom, palette.panelGradientTo]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: palette.glow }]} />

        <View
          style={[
            styles.badge,
            {
              backgroundColor: palette.badgeBackground,
              borderColor: palette.badgeBorder,
            },
          ]}
        >
          <Typography
            allowFontScaling={false}
            color={palette.badgeText}
            style={styles.badgeText}
            variant="Caption"
            weight="bold"
          >
            Solo setup
          </Typography>
        </View>

        <Typography
          accessibilityRole="header"
          allowFontScaling={false}
          style={[styles.title, { textShadowColor: palette.titleGlow }]}
          variant="H1"
          weight="bold"
        >
          Prepare your solo ritual
        </Typography>
        <Typography allowFontScaling={false} color={palette.subtitle} style={styles.subtitle}>
          Confirm your saved setup and enter your private room with calm focus.
        </Typography>

        <View
          style={[
            styles.intention,
            {
              backgroundColor: palette.intentionBackground,
              borderColor: palette.intentionBorder,
            },
          ]}
        >
          <Typography
            allowFontScaling={false}
            color={palette.statLabel}
            variant="Label"
            weight="bold"
          >
            Intention
          </Typography>
          <Typography
            allowFontScaling={false}
            color={palette.intentionText}
            variant="Body"
            weight="medium"
          >
            {intention}
          </Typography>
        </View>

        <View
          style={[
            styles.statChip,
            {
              backgroundColor: palette.statBackground,
              borderColor: palette.statBorder,
            },
          ]}
        >
          <Typography
            allowFontScaling={false}
            color={palette.statLabel}
            variant="Caption"
            weight="bold"
          >
            Today
          </Typography>
          <Typography
            allowFontScaling={false}
            color={palette.statValue}
            variant="Caption"
            weight="bold"
          >
            {loading
              ? 'Loading sessions...'
              : `${sessionsToday} completed session${sessionsToday === 1 ? '' : 's'}`}
          </Typography>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    textTransform: 'none',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  intention: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statChip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '95%',
  },
  title: {
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 15,
  },
});
