import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { LiveLogo } from '../../../components/LiveLogo';
import { Typography } from '../../../components/Typography';
import { communitySurface, motion, radii, signatureMoments, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface GlobalPulseHeroProps {
  liveEvents: number;
  strongestLiveEventTitle: string | null;
}

export function GlobalPulseHero({ liveEvents, strongestLiveEventTitle }: GlobalPulseHeroProps) {
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
          outputRange: [0.86, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={settleStyle}>
      <View style={styles.heroPanel}>
        <LinearGradient
          colors={[communitySurface.hero.panelGradientFrom, communitySurface.hero.panelGradientTo]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.collectiveBeam} />
        <View pointerEvents="none" style={styles.collectiveRing} />
        <View pointerEvents="none" style={styles.heroGlow} />

        <View style={styles.topRow}>
          <View style={styles.liveBadge}>
            <LiveLogo context="community" size={18} />
            <Typography
              allowFontScaling={false}
              color={communitySurface.hero.badgeText}
              style={styles.badgeText}
              variant="Caption"
              weight="bold"
            >
              Live Global Pulse
            </Typography>
          </View>
          <View style={styles.inlineStat}>
            <Typography
              allowFontScaling={false}
              color={communitySurface.hero.statValue}
              style={styles.inlineStatValue}
              variant="Body"
              weight="bold"
            >
              {liveEvents}
            </Typography>
            <Typography
              allowFontScaling={false}
              color={communitySurface.hero.statLabel}
              variant="Caption"
            >
              live now
            </Typography>
          </View>
        </View>

        <Typography
          accessibilityRole="header"
          allowFontScaling={false}
          style={styles.title}
          variant="H1"
          weight="bold"
        >
          Global pulse
        </Typography>

        <Typography
          allowFontScaling={false}
          color={communitySurface.hero.subtitle}
          style={styles.subtitle}
        >
          {strongestLiveEventTitle
            ? `Strongest room right now: ${strongestLiveEventTitle}.`
            : 'Live awareness feed with direct access to active collective rooms.'}
        </Typography>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgeText: {
    textTransform: 'none',
  },
  collectiveBeam: {
    backgroundColor: signatureMoments.collectiveField.stageGlow,
    borderRadius: 220,
    height: 188,
    left: 64,
    position: 'absolute',
    top: -128,
    transform: [{ rotate: '8deg' }],
    width: 188,
  },
  collectiveRing: {
    borderColor: signatureMoments.collectiveField.ringSoft,
    borderRadius: 68,
    borderWidth: 1,
    height: 136,
    position: 'absolute',
    right: -28,
    top: 14,
    width: 136,
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: communitySurface.hero.glow,
  },
  heroPanel: {
    backgroundColor: communitySurface.hero.panelBackground,
    borderColor: communitySurface.hero.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inlineStat: {
    alignItems: 'flex-end',
    gap: 1,
  },
  inlineStatValue: {
    fontSize: 16,
    lineHeight: 18,
  },
  liveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: communitySurface.hero.badgeBackground,
    borderColor: communitySurface.hero.badgeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  noMotion: {
    opacity: 1,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '96%',
  },
  title: {
    textShadowColor: communitySurface.hero.titleGlow,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
