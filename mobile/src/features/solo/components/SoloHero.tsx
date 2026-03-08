import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { PremiumHeroPanel } from '../../../components/CinematicPrimitives';
import { LiveLogo } from '../../../components/LiveLogo';
import { Typography } from '../../../components/Typography';
import {
  interaction,
  motion,
  radii,
  sectionVisualThemes,
  soloSurface,
  spacing,
} from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface SoloHeroProps {
  actionLabel?: string;
  favoriteCount: number;
  onActionPress?: () => void;
  recentCount: number;
  subtitle: string;
  title: string;
  totalCount: number;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Typography
        allowFontScaling={false}
        color={soloSurface.hero.statValue}
        variant="Body"
        weight="bold"
      >
        {value}
      </Typography>
      <Typography allowFontScaling={false} color={soloSurface.hero.statLabel} variant="Caption">
        {label}
      </Typography>
    </View>
  );
}

export function SoloHero({
  actionLabel,
  favoriteCount,
  onActionPress,
  recentCount,
  subtitle,
  title,
  totalCount,
}: SoloHeroProps) {
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
              outputRange: [12, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={settleStyle}>
      <PremiumHeroPanel
        fallbackIcon="book-open-page-variant-outline"
        fallbackLabel="Solo aura"
        section="solo"
        style={styles.panel}
      >
        <View style={styles.badge}>
          <LiveLogo context="solo" size={14} />
          <Typography color={soloSurface.hero.badgeText} style={styles.badgeText} variant="Caption" weight="bold">
            Solo sanctuary
          </Typography>
        </View>

        <Typography accessibilityRole="header" style={styles.title} variant="H1" weight="bold">
          {title}
        </Typography>
        <Typography color={soloSurface.hero.subtitle} style={styles.subtitle}>
          {subtitle}
        </Typography>

        <View style={styles.statRow}>
          <StatPill label="Favorites" value={favoriteCount.toString()} />
          <StatPill label="Recent" value={recentCount.toString()} />
          <StatPill label="Library" value={totalCount.toString()} />
        </View>

        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityHint="Opens the full prayer library."
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.action,
              !reduceMotionEnabled && pressed && styles.actionPressed,
            ]}
          >
            <Typography color={soloSurface.hero.actionText} variant="Caption" weight="bold">
              {actionLabel}
            </Typography>
          </Pressable>
        ) : null}
      </PremiumHeroPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'flex-start',
    backgroundColor: sectionVisualThemes.solo.surface.card[0],
    borderColor: sectionVisualThemes.solo.surface.edge,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  actionPressed: {
    transform: [{ scale: interaction.chip.pressedScale }],
  },
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
  noMotion: {
    opacity: 1,
  },
  panel: {
    gap: spacing.sm,
  },
  statPill: {
    backgroundColor: soloSurface.hero.statBackground,
    borderColor: soloSurface.hero.statBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '95%',
  },
  title: {
    textShadowColor: soloSurface.hero.titleGlow,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 15,
  },
});
