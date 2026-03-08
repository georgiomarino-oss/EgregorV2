import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { PremiumHeroPanel } from '../../../components/CinematicPrimitives';
import { LiveLogo } from '../../../components/LiveLogo';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { Typography } from '../../../components/Typography';
import { motion, profileSurface, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface TrustHeroProps {
  accountEmail: string | null;
  loading: boolean;
  sessionsThisWeek: number;
  soloStreakDays: number;
  weeklyImpactChangePercent: number;
}

function formatImpact(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }
  return `${value}%`;
}

export function TrustHero({
  accountEmail,
  loading,
  sessionsThisWeek,
  soloStreakDays,
  weeklyImpactChangePercent,
}: TrustHeroProps) {
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
        fallbackIcon="shield-check-outline"
        fallbackLabel="Trust ledger"
        section="profile"
        style={styles.panel}
      >
        <View style={styles.badge}>
          <LiveLogo context="profile" size={14} />
          <Typography color={profileSurface.hero.badgeText} style={styles.badgeText} variant="Caption" weight="bold">
            Trust sanctuary
          </Typography>
        </View>

        <Typography accessibilityRole="header" style={styles.title} variant="H1" weight="bold">
          Trust and progress
        </Typography>
        <Typography color={profileSurface.hero.subtitle} style={styles.subtitle}>
          Reflect on your practice, track your consistency, and hold your intention with clarity.
        </Typography>

        {loading ? (
          <LoadingStateCard
            compact
            minHeight={118}
            subtitle="Refreshing your latest trust and progress summary."
            style={styles.loadingCard}
            title="Loading trust snapshot"
          />
        ) : (
          <>
            <View style={styles.metricRow}>
              <Typography
                color={profileSurface.hero.metricValue}
                variant="Metric"
                weight="bold"
              >
                {formatImpact(weeklyImpactChangePercent)}
              </Typography>
              <Typography
                color={profileSurface.hero.metricLabel}
                style={styles.metricLabel}
                variant="Label"
              >
                Weekly collective impact
              </Typography>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Typography
                  color={profileSurface.hero.chipText}
                  variant="Caption"
                  weight="bold"
                >
                  {`Streak: ${soloStreakDays} days`}
                </Typography>
              </View>
              <View style={styles.metaChip}>
                <Typography
                  color={profileSurface.hero.chipText}
                  variant="Caption"
                  weight="bold"
                >
                  {`Sessions this week: ${sessionsThisWeek}`}
                </Typography>
              </View>
            </View>
          </>
        )}

        <View style={styles.accountRow}>
          <Typography
            color={profileSurface.hero.accountLabel}
            variant="Caption"
            weight="bold"
          >
            Account
          </Typography>
          <Typography
            color={profileSurface.hero.accountValue}
            variant="Caption"
          >
            {accountEmail ?? 'Unavailable'}
          </Typography>
        </View>
      </PremiumHeroPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    borderTopColor: profileSurface.hero.panelBorder,
    borderTopWidth: 1,
    gap: 2,
    paddingTop: spacing.xs,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: profileSurface.hero.badgeBackground,
    borderColor: profileSurface.hero.badgeBorder,
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
  loadingCard: {
    backgroundColor: profileSurface.hero.panelBackground,
    borderColor: profileSurface.hero.panelBorder,
  },
  metaChip: {
    alignSelf: 'flex-start',
    backgroundColor: profileSurface.hero.chipBackground,
    borderColor: profileSurface.hero.chipBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricLabel: {
    textTransform: 'none',
  },
  metricRow: {
    gap: 2,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    gap: spacing.sm,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '95%',
  },
  title: {
    textShadowColor: profileSurface.hero.titleGlow,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
});
