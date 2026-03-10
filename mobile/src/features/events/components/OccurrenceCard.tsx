import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PremiumLiveEventCardSurface } from '../../../components/CinematicPrimitives';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { resolveOccurrenceCardArt } from '../../../lib/art/cinematicArt';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import {
  eventsSurface,
  interaction,
  motion,
  radii,
  sectionVisualThemes,
  spacing,
} from '../../../theme/tokens';
import type { LiveFeedSectionKey } from '../types';
import type { ScheduledEventOccurrence } from '../types';
import { formatOccurrenceStartLabel, statusLabel } from '../utils/occurrence';
import { resolveOccurrenceVisualState } from '../utils/occurrenceVisualState';

interface OccurrenceCardProps {
  isSubscribed: boolean;
  isUpdatingBell: boolean;
  item: ScheduledEventOccurrence;
  onOpen: () => void;
  onToggleSubscription: () => void;
  orderIndex?: number;
  sectionKey?: LiveFeedSectionKey;
  width: number;
}

export function OccurrenceCard({
  isSubscribed,
  isUpdatingBell,
  item,
  onOpen,
  onToggleSubscription,
  orderIndex = 0,
  sectionKey,
  width,
}: OccurrenceCardProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);
  const { emphasisIcon, emphasisLabel, fallbackLabel, isElevenEleven, isFlagship } =
    resolveOccurrenceVisualState(sectionKey);

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

  const primaryActionLabel =
    item.status === 'live'
      ? 'Join now'
      : item.status === 'waiting_room'
        ? 'Enter waiting room'
        : item.status === 'ended'
          ? 'View details'
          : 'View details';

  return (
    <Animated.View style={settleStyle}>
      <Pressable
        accessibilityHint="Opens this live room."
        accessibilityLabel={`${item.title}. ${statusLabel(item.status)}. Starts ${formatOccurrenceStartLabel(item.startsAt)}. ${item.durationMinutes} minutes.`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [!reduceMotionEnabled && pressed && styles.cardPressed]}
      >
        <PremiumLiveEventCardSurface
          artSource={resolveOccurrenceCardArt(sectionKey)}
          fallbackIcon="earth"
          fallbackLabel={fallbackLabel ?? item.category}
          section="live"
          style={[
            styles.card,
            { width },
            isElevenEleven ? styles.signatureCard : null,
            isFlagship ? styles.flagshipCard : null,
          ]}
        >
          {emphasisLabel ? (
            <View style={styles.signatureBadge}>
              <MaterialCommunityIcons
                color={sectionVisualThemes.live.surface.highlight}
                name={emphasisIcon}
                size={14}
              />
              <Typography
                color={sectionVisualThemes.live.surface.highlight}
                style={styles.signatureBadgeText}
                variant="Caption"
                weight="bold"
              >
                {emphasisLabel}
              </Typography>
            </View>
          ) : null}

          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Typography
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
                      : item.status === 'waiting_room' || item.status === 'soon'
                        ? {
                            backgroundColor: eventsSurface.occurrence.soonChipBackground,
                            borderColor: eventsSurface.occurrence.soonChipBorder,
                            textColor: eventsSurface.occurrence.soonChipText,
                          }
                        : item.status === 'ended'
                          ? {
                              backgroundColor: eventsSurface.occurrence.upcomingChipBackground,
                              borderColor: eventsSurface.occurrence.upcomingChipBorder,
                              textColor: eventsSurface.occurrence.itemMeta,
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
              accessibilityLabel={
                isSubscribed ? 'Disable live reminders' : 'Enable live reminders'
              }
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
            color={eventsSurface.occurrence.itemBody}
            style={styles.cardBody}
          >
            {item.body}
          </Typography>

          <View style={styles.bottomMetaRow}>
            <Typography
              color={eventsSurface.occurrence.itemMeta}
              variant="Caption"
              weight="bold"
            >
              {formatOccurrenceStartLabel(item.startsAt)}
            </Typography>
            <Typography
              color={eventsSurface.occurrence.itemMeta}
              variant="Caption"
              weight="bold"
            >
              {`${item.durationMinutes} min`}
            </Typography>
          </View>

          <View style={styles.ctaRow}>
            <Typography
              color={eventsSurface.occurrence.ctaText}
              style={styles.ctaText}
              variant="Body"
              weight="bold"
            >
              {primaryActionLabel}
            </Typography>
            <MaterialCommunityIcons
              color={eventsSurface.occurrence.ctaText}
              name="arrow-right"
              size={17}
            />
          </View>
        </PremiumLiveEventCardSurface>
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
  flagshipCard: {
    borderColor: sectionVisualThemes.live.surface.highlight,
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
  signatureBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: sectionVisualThemes.live.surface.card[0],
    borderColor: sectionVisualThemes.live.surface.edge,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  signatureBadgeText: {
    textTransform: 'none',
  },
  signatureCard: {
    borderColor: sectionVisualThemes.live.surface.edge,
  },
  subscriptionButtonActive: {
    backgroundColor: eventsSurface.occurrence.bellActiveBackground,
    borderColor: eventsSurface.occurrence.bellActiveBorder,
  },
});
