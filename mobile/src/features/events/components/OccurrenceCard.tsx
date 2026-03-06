import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { eventsSurface, interaction, motion, radii, spacing } from '../../../theme/tokens';
import type { ScheduledEventOccurrence } from '../types';
import { formatOccurrenceStartLabel, statusLabel } from '../utils/occurrence';

interface OccurrenceCardProps {
  isSubscribed: boolean;
  isUpdatingBell: boolean;
  item: ScheduledEventOccurrence;
  onOpen: () => void;
  onToggleSubscription: () => void;
  orderIndex?: number;
  width: number;
}

export function OccurrenceCard({
  isSubscribed,
  isUpdatingBell,
  item,
  onOpen,
  onToggleSubscription,
  orderIndex = 0,
  width,
}: OccurrenceCardProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(Math.min(220, orderIndex * 35)),
      Animated.timing(settle, {
        duration: motion.durationMs.slow,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [orderIndex, reduceMotionEnabled, settle]);

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
              outputRange: [9, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={settleStyle}>
      <Pressable
        accessibilityHint="Opens this event room."
        accessibilityLabel={`${item.title}. ${statusLabel(item.status)}. Starts ${formatOccurrenceStartLabel(item.startsAt)}. ${item.durationMinutes} minutes.`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [!reduceMotionEnabled && pressed && styles.cardPressed]}
      >
        <View style={[styles.card, { width }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Typography
                allowFontScaling={false}
                numberOfLines={2}
                style={styles.cardTitle}
                variant="H2"
                weight="bold"
              >
                {item.title}
              </Typography>
              <View style={styles.metaRow}>
                <StatusChip
                  colors={
                    item.status === 'live'
                      ? {
                          backgroundColor: eventsSurface.occurrence.liveChipBackground,
                          borderColor: eventsSurface.occurrence.liveChipBorder,
                          textColor: eventsSurface.occurrence.liveChipText,
                        }
                      : item.status === 'soon'
                        ? {
                            backgroundColor: eventsSurface.occurrence.soonChipBackground,
                            borderColor: eventsSurface.occurrence.soonChipBorder,
                            textColor: eventsSurface.occurrence.soonChipText,
                          }
                        : {
                            backgroundColor: eventsSurface.occurrence.upcomingChipBackground,
                            borderColor: eventsSurface.occurrence.upcomingChipBorder,
                            textColor: eventsSurface.occurrence.upcomingChipText,
                          }
                  }
                  label={statusLabel(item.status)}
                />
                <View style={styles.categoryBadge}>
                  <Typography
                    allowFontScaling={false}
                    color={eventsSurface.occurrence.categoryBadgeText}
                    style={styles.categoryBadgeText}
                    variant="Caption"
                    weight="bold"
                  >
                    {item.category}
                  </Typography>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityLabel={isSubscribed ? 'Disable event alerts' : 'Enable event alerts'}
              accessibilityRole="button"
              accessibilityState={{ busy: isUpdatingBell, selected: isSubscribed }}
              hitSlop={6}
              onPress={(event) => {
                event.stopPropagation();
                onToggleSubscription();
              }}
              style={({ pressed }) => [
                styles.actionButton,
                isSubscribed && styles.subscriptionButtonActive,
                !reduceMotionEnabled && pressed && styles.actionButtonPressed,
              ]}
            >
              <MaterialCommunityIcons
                color={
                  isSubscribed
                    ? eventsSurface.occurrence.categoryBadgeText
                    : eventsSurface.occurrence.itemMeta
                }
                name={
                  isUpdatingBell ? 'bell-ring-outline' : isSubscribed ? 'bell-ring' : 'bell-outline'
                }
                size={18}
              />
            </Pressable>
          </View>

          <Typography
            allowFontScaling={false}
            color={eventsSurface.occurrence.itemBody}
            style={styles.cardBody}
          >
            {item.body}
          </Typography>

          <View style={styles.bottomMetaRow}>
            <Typography
              allowFontScaling={false}
              color={eventsSurface.occurrence.itemMeta}
              variant="Caption"
              weight="bold"
            >
              {formatOccurrenceStartLabel(item.startsAt)}
            </Typography>
            <Typography
              allowFontScaling={false}
              color={eventsSurface.occurrence.itemMeta}
              variant="Caption"
              weight="bold"
            >
              {`${item.durationMinutes} min`}
            </Typography>
          </View>

          <View style={styles.ctaRow}>
            <Typography
              allowFontScaling={false}
              color={eventsSurface.occurrence.ctaText}
              style={styles.ctaText}
              variant="Body"
              weight="bold"
            >
              Enter room
            </Typography>
            <MaterialCommunityIcons
              color={eventsSurface.occurrence.ctaText}
              name="arrow-right"
              size={17}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: eventsSurface.filter.chipBackground,
    borderColor: eventsSurface.filter.chipBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionButtonPressed: {
    transform: [{ scale: interaction.iconButton.pressedScale }],
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: eventsSurface.occurrence.itemBackground,
    borderColor: eventsSurface.occurrence.itemBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 232,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardBody: {
    minHeight: 64,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  cardPressed: {
    opacity: interaction.card.pressedOpacity,
    transform: [{ scale: interaction.card.pressedScale }],
  },
  cardTitle: {
    color: eventsSurface.occurrence.itemTitle,
    flex: 1,
    lineHeight: 24,
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  categoryBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: eventsSurface.occurrence.categoryBadgeBackground,
    borderColor: eventsSurface.occurrence.categoryBadgeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    textTransform: 'none',
  },
  ctaRow: {
    alignItems: 'center',
    backgroundColor: eventsSurface.occurrence.ctaBackground,
    borderColor: eventsSurface.occurrence.ctaBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  ctaText: {
    textTransform: 'none',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  noMotion: {
    opacity: 1,
  },
  subscriptionButtonActive: {
    backgroundColor: eventsSurface.occurrence.bellActiveBackground,
    borderColor: eventsSurface.occurrence.bellActiveBorder,
  },
});
