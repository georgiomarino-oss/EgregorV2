import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { MetricRow } from '../../../components/MetricRow';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { motion, profileSurface, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface TrustMetricsPanelProps {
  circleMembers: number;
  eventsJoinedThisWeek: number;
  loading: boolean;
  minutesPrayed: number;
  sessionsThisWeek: number;
  soloStreakDays: number;
}

export function TrustMetricsPanel({
  circleMembers,
  eventsJoinedThisWeek,
  loading,
  minutesPrayed,
  sessionsThisWeek,
  soloStreakDays,
}: TrustMetricsPanelProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.durationMs.slow,
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
          outputRange: [0.88, 1],
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
    <Animated.View style={[styles.panel, settleStyle]}>
      <View style={styles.callout}>
        <Typography
          allowFontScaling={false}
          color={profileSurface.metrics.calloutText}
          style={styles.calloutText}
          variant="Caption"
        >
          Personal consistency strengthens collective momentum.
        </Typography>
      </View>

      {loading ? (
        <LoadingStateCard
          compact
          minHeight={186}
          subtitle="Syncing your trust and participation metrics."
          style={styles.loadingCard}
          title="Loading progress metrics"
        />
      ) : (
        <>
          <View style={styles.section}>
            <SectionHeader
              compact
              subtitle="Keep rhythm with your solo intention work."
              subtitleColor={profileSurface.metrics.sectionSubtitle}
              title="Personal practice"
              titleColor={profileSurface.metrics.sectionLabel}
            />
            <View style={styles.rows}>
              <MetricRow label="Minutes prayed" value={minutesPrayed.toString()} />
              <MetricRow label="Sessions this week" value={sessionsThisWeek.toString()} />
              <MetricRow label="Solo completion streak" value={`${soloStreakDays} days`} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <SectionHeader
              compact
              subtitle="See how your presence supports the wider field."
              subtitleColor={profileSurface.metrics.sectionSubtitle}
              title="Collective participation"
              titleColor={profileSurface.metrics.sectionLabel}
            />
            <View style={styles.rows}>
              <MetricRow label="Circle members" value={circleMembers.toString()} />
              <MetricRow
                label="Event rooms joined this week"
                value={eventsJoinedThisWeek.toString()}
              />
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  callout: {
    backgroundColor: profileSurface.metrics.calloutBackground,
    borderColor: profileSurface.metrics.calloutBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  calloutText: {
    lineHeight: 17,
  },
  divider: {
    backgroundColor: profileSurface.metrics.divider,
    height: 1,
  },
  loadingCard: {
    backgroundColor: profileSurface.metrics.sectionBackground,
    borderColor: profileSurface.metrics.sectionBorder,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    backgroundColor: profileSurface.metrics.sectionBackground,
    borderColor: profileSurface.metrics.sectionBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rows: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
});
