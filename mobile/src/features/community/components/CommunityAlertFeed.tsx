import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { EmptyStateCard } from '../../../components/EmptyStateCard';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { RetryPanel } from '../../../components/RetryPanel';
import { Typography } from '../../../components/Typography';
import type { CommunityAlert } from '../../../lib/api/data';
import { communitySurface, interaction, motion, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface CommunityAlertFeedProps {
  alerts: CommunityAlert[];
  emptyState: boolean;
  errorMessage: string | null;
  onOpenEventDetails: (eventId: string) => void;
  onRetry?: () => void;
}

function AlertCard({
  alert,
  onOpenEventDetails,
}: {
  alert: CommunityAlert;
  onOpenEventDetails: (eventId: string) => void;
}) {
  const reduceMotionEnabled = useReducedMotion();

  return (
    <Pressable
      accessibilityHint="Opens event details."
      accessibilityLabel={`${alert.title}. ${alert.subtitle}`}
      accessibilityRole="button"
      onPress={() => onOpenEventDetails(alert.eventId)}
      style={({ pressed }) => [styles.pressable, !reduceMotionEnabled && pressed && styles.pressed]}
    >
      <View style={styles.alertCard}>
        <Typography
          allowFontScaling={false}
          color={communitySurface.alerts.title}
          style={styles.alertTitle}
          variant="H2"
          weight="bold"
        >
          {alert.title}
        </Typography>
        <Typography
          allowFontScaling={false}
          color={communitySurface.alerts.subtitle}
          style={styles.alertSubtitle}
          variant="Caption"
        >
          {alert.subtitle}
        </Typography>
      </View>
    </Pressable>
  );
}

export function CommunityAlertFeed({
  alerts,
  emptyState,
  errorMessage,
  onOpenEventDetails,
  onRetry,
}: CommunityAlertFeedProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.durationMs.base,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, settle]);

  const shouldRenderSection = Boolean(errorMessage) || emptyState || alerts.length > 0;
  if (!shouldRenderSection) {
    return null;
  }

  const settleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: settle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={[styles.section, settleStyle]}>
      <Typography
        allowFontScaling={false}
        color={communitySurface.alerts.label}
        style={styles.sectionLabel}
        variant="Label"
        weight="bold"
      >
        Live activity
      </Typography>

      {errorMessage ? (
        onRetry ? (
          <RetryPanel
            message={errorMessage}
            onRetry={onRetry}
            retryLabel="Retry"
            style={styles.feedbackCard}
            title="Could not load community feed"
          />
        ) : (
          <InlineErrorCard
            message={errorMessage}
            style={styles.feedbackCard}
            title="Could not load community feed"
          />
        )
      ) : null}

      {emptyState ? (
        <EmptyStateCard
          backgroundColor={communitySurface.alerts.emptyBackground}
          body="New event updates appear here as soon as rooms go live."
          bodyColor={communitySurface.alerts.subtitle}
          borderColor={communitySurface.alerts.emptyBorder}
          iconBackgroundColor={communitySurface.hero.badgeBackground}
          iconBorderColor={communitySurface.hero.badgeBorder}
          iconName="broadcast"
          iconTint={communitySurface.hero.badgeText}
          style={styles.feedbackCard}
          title="No live alerts right now"
          titleColor={communitySurface.alerts.title}
        />
      ) : (
        alerts.map((alert) => (
          <AlertCard alert={alert} key={alert.eventId} onOpenEventDetails={onOpenEventDetails} />
        ))
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  alertCard: {
    backgroundColor: communitySurface.alerts.itemBackground,
    borderColor: communitySurface.alerts.itemBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    minHeight: 74,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  alertSubtitle: {
    lineHeight: 16,
  },
  alertTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  feedbackCard: {
    overflow: 'hidden',
  },
  noMotion: {
    opacity: 1,
  },
  pressed: {
    transform: [{ scale: interaction.card.pressedScale }],
  },
  pressable: {
    borderRadius: radii.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    textTransform: 'none',
  },
});
