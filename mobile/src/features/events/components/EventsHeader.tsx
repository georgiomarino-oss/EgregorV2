import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LiveLogo } from '../../../components/LiveLogo';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { eventsSurface, motion, radii, spacing } from '../../../theme/tokens';

interface EventsHeaderProps {
  deviceTimeZoneLabel: string;
  liveCount: number;
  participantCount: number;
  upcomingCount: number;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Typography
        allowFontScaling={false}
        color={eventsSurface.occurrence.categoryBadgeText}
        style={styles.statPillValue}
        variant="Body"
        weight="bold"
      >
        {value}
      </Typography>
      <Typography
        allowFontScaling={false}
        color={eventsSurface.hero.eyebrow}
        style={styles.statPillLabel}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
    </View>
  );
}

export function EventsHeader({
  deviceTimeZoneLabel,
  liveCount,
  participantCount,
  upcomingCount,
}: EventsHeaderProps) {
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
      <View style={styles.heroPanel}>
        <View style={styles.headerTopRow}>
          <View style={styles.liveBadge}>
            <LiveLogo context="events" size={18} />
            <Typography
              allowFontScaling={false}
              color={eventsSurface.hero.accent}
              style={styles.liveBadgeText}
              variant="Caption"
              weight="bold"
            >
              Live
            </Typography>
          </View>
          <Typography
            allowFontScaling={false}
            color={eventsSurface.hero.timezone}
            style={styles.timeZoneLabel}
            variant="Caption"
          >
            {deviceTimeZoneLabel}
          </Typography>
        </View>

        <Typography
          accessibilityRole="header"
          allowFontScaling={false}
          style={styles.title}
          variant="H1"
          weight="bold"
        >
          Collective Intention
        </Typography>

        <Typography
          allowFontScaling={false}
          color={eventsSurface.hero.subtitle}
          style={styles.body}
        >
          Join real shared rooms in rhythm with your local timezone and global moments.
        </Typography>

        <View style={styles.statsRow}>
          <StatPill label="Live now" value={liveCount.toString()} />
          <StatPill label="Next up" value={upcomingCount.toString()} />
          <StatPill label="Active" value={participantCount.toString()} />
        </View>

        <Typography allowFontScaling={false} color={eventsSurface.hero.timezone} variant="Caption">
          Times shown in {deviceTimeZoneLabel}
        </Typography>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: {
    lineHeight: 19,
    maxWidth: '94%',
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroPanel: {
    backgroundColor: eventsSurface.hero.panelBackdrop,
    borderColor: eventsSurface.hero.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  liveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: eventsSurface.occurrence.categoryBadgeBackground,
    borderColor: eventsSurface.occurrence.categoryBadgeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  liveBadgeText: {
    textTransform: 'none',
  },
  noMotion: {
    opacity: 1,
  },
  statPill: {
    backgroundColor: eventsSurface.occurrence.categoryBadgeBackground,
    borderColor: eventsSurface.occurrence.categoryBadgeBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statPillLabel: {
    textTransform: 'none',
  },
  statPillValue: {
    fontSize: 16,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeZoneLabel: {
    textTransform: 'none',
  },
  title: {
    textShadowColor: eventsSurface.hero.titleGlow,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
});
