import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '../../../components/Button';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { Typography } from '../../../components/Typography';
import { communitySurface, motion, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface LiveMetricsPanelProps {
  countries: number;
  liveEvents: number;
  loading: boolean;
  onPrimaryAction: () => void;
  primaryActionTitle: string;
  uniqueActiveParticipants: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Typography
        allowFontScaling={false}
        color={communitySurface.metrics.statLabel}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
      <Typography
        allowFontScaling={false}
        color={communitySurface.metrics.statValue}
        style={styles.statValue}
        variant="H2"
        weight="bold"
      >
        {value}
      </Typography>
    </View>
  );
}

export function LiveMetricsPanel({
  countries,
  liveEvents,
  loading,
  onPrimaryAction,
  primaryActionTitle,
  uniqueActiveParticipants,
}: LiveMetricsPanelProps) {
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
      <View style={styles.panel}>
        <LinearGradient
          colors={[
            communitySurface.metrics.panelGradientFrom,
            communitySurface.metrics.panelGradientTo,
          ]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {loading ? (
          <LoadingStateCard
            compact
            minHeight={172}
            subtitle="Refreshing live counters and participant presence."
            style={styles.loadingCard}
            title="Loading global pulse"
          />
        ) : (
          <>
            <View style={styles.primaryMetricBlock}>
              <Typography
                allowFontScaling={false}
                color={communitySurface.metrics.primaryValue}
                variant="Metric"
                weight="bold"
              >
                {uniqueActiveParticipants}
              </Typography>
              <Typography
                allowFontScaling={false}
                color={communitySurface.metrics.primaryLabel}
                variant="Label"
              >
                Participants online
              </Typography>
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Live events" value={liveEvents.toString()} />
              <StatCard label="Countries" value={countries.toString()} />
            </View>

            <Button onPress={onPrimaryAction} title={primaryActionTitle} variant="primary" />

            <Typography
              allowFontScaling={false}
              color={communitySurface.metrics.context}
              variant="Caption"
            >
              Presence updates in real-time with backup refresh every 15 seconds.
            </Typography>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: communitySurface.metrics.panelBackground,
    borderColor: communitySurface.metrics.panelBorder,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    backgroundColor: communitySurface.metrics.panelBackground,
    borderColor: communitySurface.metrics.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryMetricBlock: {
    alignItems: 'flex-start',
    gap: 2,
  },
  statCard: {
    backgroundColor: communitySurface.metrics.statCardBackground,
    borderColor: communitySurface.metrics.statCardBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statValue: {
    lineHeight: 24,
  },
});
