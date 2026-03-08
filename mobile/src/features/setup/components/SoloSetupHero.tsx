import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { PremiumHeroPanel } from '../../../components/CinematicPrimitives';
import { LiveLogo } from '../../../components/LiveLogo';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { motion, radii, sectionVisualThemes, soloSurface, spacing } from '../../../theme/tokens';

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
      <PremiumHeroPanel
        fallbackIcon="meditation"
        fallbackLabel="Solo setup"
        section="solo"
        style={styles.panel}
      >
        <View style={styles.badge}>
          <LiveLogo context="solo" size={14} />
          <Typography color={soloSurface.hero.badgeText} style={styles.badgeText} variant="Caption" weight="bold">
            Solo setup
          </Typography>
        </View>

        <Typography accessibilityRole="header" style={styles.title} variant="H1" weight="bold">
          Prepare your solo ritual
        </Typography>
        <Typography color={soloSurface.hero.subtitle} style={styles.subtitle}>
          Confirm your saved setup and enter your private room with calm focus.
        </Typography>

        <View style={styles.intention}>
          <Typography color={sectionVisualThemes.solo.nav.labelIdle} variant="Label" weight="bold">
            Intention
          </Typography>
          <Typography color={soloSurface.card.title} variant="Body" weight="medium">
            {intention}
          </Typography>
        </View>

        <View style={styles.statChip}>
          <Typography color={sectionVisualThemes.solo.nav.labelIdle} variant="Caption" weight="bold">
            Today
          </Typography>
          <Typography color={soloSurface.card.ctaText} variant="Caption" weight="bold">
            {loading
              ? 'Loading sessions...'
              : `${sessionsToday} completed session${sessionsToday === 1 ? '' : 's'}`}
          </Typography>
        </View>
      </PremiumHeroPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: soloSurface.hero.badgeBackground,
    borderColor: soloSurface.hero.badgeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    textTransform: 'none',
  },
  intention: {
    backgroundColor: sectionVisualThemes.solo.surface.card[0],
    borderColor: sectionVisualThemes.solo.surface.edge,
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
    gap: spacing.sm,
  },
  statChip: {
    alignSelf: 'flex-start',
    backgroundColor: soloSurface.card.ctaBackground,
    borderColor: soloSurface.card.ctaBorder,
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
    textShadowColor: soloSurface.hero.titleGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
});