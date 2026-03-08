import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { PremiumHeroPanel } from '../../../components/CinematicPrimitives';
import { LiveLogo } from '../../../components/LiveLogo';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { motion, sectionVisualThemes, spacing } from '../../../theme/tokens';

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
        fallbackIcon="earth"
        fallbackLabel="Live room"
        section="live"
        style={styles.panel}
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            {statusTone === 'live' ? <LiveLogo context="events" size={14} /> : null}
            <Typography
              color={sectionVisualThemes.live.nav.labelActive}
              style={styles.badgeText}
              variant="Caption"
              weight="bold"
            >
              {contextLabel}
            </Typography>
          </View>

          <StatusChip label={statusLabel} tone={statusTone === 'live' ? 'live' : statusTone} uppercase={false} />
        </View>

        <Typography accessibilityRole="header" style={styles.title} variant="H1" weight="bold">
          {title}
        </Typography>
        <Typography color={sectionVisualThemes.live.nav.labelIdle} style={styles.subtitle}>
          {subtitle}
        </Typography>
      </PremiumHeroPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: sectionVisualThemes.live.surface.card[0],
    borderColor: sectionVisualThemes.live.surface.edge,
    borderRadius: 999,
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
  subtitle: {
    lineHeight: 19,
    maxWidth: '96%',
  },
  title: {
    textShadowColor: sectionVisualThemes.live.surface.highlight,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});