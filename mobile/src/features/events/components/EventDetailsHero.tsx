import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LiveLogo } from '../../../components/LiveLogo';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { handoffSurface, motion, radii, spacing } from '../../../theme/tokens';

export type EventDetailsStatusTone = 'live' | 'soon' | 'upcoming' | 'scheduled' | 'template';

interface EventDetailsHeroProps {
  contextLabel: string;
  statusLabel: string;
  statusTone: EventDetailsStatusTone;
  subtitle: string;
  title: string;
}

export function EventDetailsHero({
  contextLabel,
  statusLabel,
  statusTone,
  subtitle,
  title,
}: EventDetailsHeroProps) {
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

  const palette = handoffSurface.eventDetails;
  const statusColors = {
    live: {
      backgroundColor: palette.status.liveBackground,
      borderColor: palette.status.liveBorder,
      textColor: palette.status.liveText,
    },
    soon: {
      backgroundColor: palette.status.soonBackground,
      borderColor: palette.status.soonBorder,
      textColor: palette.status.soonText,
    },
    upcoming: {
      backgroundColor: palette.status.upcomingBackground,
      borderColor: palette.status.upcomingBorder,
      textColor: palette.status.upcomingText,
    },
    scheduled: {
      backgroundColor: palette.status.scheduledBackground,
      borderColor: palette.status.scheduledBorder,
      textColor: palette.status.scheduledText,
    },
    template: {
      backgroundColor: palette.status.templateBackground,
      borderColor: palette.status.templateBorder,
      textColor: palette.status.templateText,
    },
  } as const;

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
            backgroundColor: palette.hero.panelBackground,
            borderColor: palette.hero.panelBorder,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: palette.hero.glow }]}
        />

        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: palette.hero.badgeBackground,
                borderColor: palette.hero.badgeBorder,
              },
            ]}
          >
            {statusTone === 'live' ? <LiveLogo context="events" size={14} /> : null}
            <Typography
              allowFontScaling={false}
              color={palette.hero.badgeText}
              style={styles.badgeText}
              variant="Caption"
              weight="bold"
            >
              {contextLabel}
            </Typography>
          </View>

          <StatusChip colors={statusColors[statusTone]} label={statusLabel} uppercase={false} />
        </View>

        <Typography
          accessibilityRole="header"
          allowFontScaling={false}
          style={[styles.title, { textShadowColor: palette.hero.titleGlow }]}
          variant="H1"
          weight="bold"
        >
          {title}
        </Typography>
        <Typography allowFontScaling={false} color={palette.hero.subtitle} style={styles.subtitle}>
          {subtitle}
        </Typography>

        <View
          style={[
            styles.contextRow,
            {
              backgroundColor: palette.hero.contextBackground,
              borderColor: palette.hero.contextBorder,
            },
          ]}
        >
          <Typography
            allowFontScaling={false}
            color={palette.hero.metaText}
            variant="Caption"
            weight="bold"
          >
            {contextLabel}
          </Typography>
          <Typography allowFontScaling={false} color={palette.hero.contextText} variant="Caption">
            {statusLabel}
          </Typography>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
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
  contextRow: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
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
    position: 'relative',
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '96%',
  },
  title: {
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
