import { useEffect, useMemo, type ComponentProps } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Typography } from '../../../components/Typography';
import { communitySurface, interaction, motion, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface CircleEntryCardsProps {
  eventsCircleCount: number;
  onOpenEventsCircle: () => void;
  onOpenPrayerCircle: () => void;
  prayerCircleCount: number;
}

function CircleCard({
  count,
  icon,
  label,
  onPress,
  title,
}: {
  count: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  title: string;
}) {
  const reduceMotionEnabled = useReducedMotion();

  return (
    <Pressable
      accessibilityHint="Opens this circle."
      accessibilityLabel={`${title}. ${count} members. ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardPressable,
        !reduceMotionEnabled && pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons color={communitySurface.circles.title} name={icon} size={17} />
          </View>
          <Typography
            allowFontScaling={false}
            color={communitySurface.circles.count}
            style={styles.count}
            variant="H2"
            weight="bold"
          >
            {count}
          </Typography>
        </View>
        <Typography
          allowFontScaling={false}
          color={communitySurface.circles.title}
          style={styles.title}
          variant="Body"
          weight="bold"
        >
          {title}
        </Typography>
        <Typography
          allowFontScaling={false}
          color={communitySurface.circles.label}
          variant="Caption"
        >
          {label}
        </Typography>
      </View>
    </Pressable>
  );
}

export function CircleEntryCards({
  eventsCircleCount,
  onOpenEventsCircle,
  onOpenPrayerCircle,
  prayerCircleCount,
}: CircleEntryCardsProps) {
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
    <Animated.View style={[styles.row, settleStyle]}>
      <CircleCard
        count={prayerCircleCount}
        icon="hands-pray"
        label="Shared intentions"
        onPress={onOpenPrayerCircle}
        title="Prayer Circle"
      />
      <CircleCard
        count={eventsCircleCount}
        icon="earth"
        label="Collective rooms"
        onPress={onOpenEventsCircle}
        title="Events Circle"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: communitySurface.circles.cardBackground,
    borderColor: communitySurface.circles.cardBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    minHeight: 108,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardPressed: {
    opacity: interaction.card.pressedOpacity,
    transform: [{ scale: interaction.card.pressedScale }],
  },
  cardPressable: {
    borderRadius: radii.md,
    flex: 1,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  count: {
    lineHeight: 24,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: communitySurface.circles.iconBackground,
    borderColor: communitySurface.circles.iconBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  noMotion: {
    opacity: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  title: {
    textTransform: 'none',
  },
});
