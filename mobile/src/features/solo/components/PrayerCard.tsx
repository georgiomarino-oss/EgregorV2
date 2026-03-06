import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Typography } from '../../../components/Typography';
import type { PrayerLibraryItem } from '../../../lib/api/data';
import { interaction, motion, radii, soloSurface, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface PrayerCardProps {
  categoryLabel: string;
  isFavorite: boolean;
  item: PrayerLibraryItem;
  onStartPrayer: () => void;
  onToggleFavorite: () => void;
  orderIndex?: number;
  featured?: boolean;
  width: number;
}

export function PrayerCard({
  categoryLabel,
  featured = false,
  isFavorite,
  item,
  onStartPrayer,
  onToggleFavorite,
  orderIndex = 0,
  width,
}: PrayerCardProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(Math.min(220, orderIndex * 30)),
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
    <Animated.View style={settleStyle}>
      <Pressable
        accessibilityHint="Opens this prayer in your solo room."
        accessibilityLabel={`${item.title}. ${item.durationMinutes} minutes. ${categoryLabel}. ${item.startsCount} starts.`}
        accessibilityRole="button"
        onPress={onStartPrayer}
        style={({ pressed }) => [!reduceMotionEnabled && pressed && styles.cardPressed]}
      >
        <View style={[styles.card, { width }, featured ? styles.cardFeatured : styles.cardRegular]}>
          <View style={styles.header}>
            <Typography
              allowFontScaling={false}
              color={soloSurface.card.title}
              style={styles.title}
              variant="H2"
              weight="bold"
            >
              {item.title}
            </Typography>
            <Pressable
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityRole="button"
              accessibilityState={{ selected: isFavorite }}
              hitSlop={6}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              style={({ pressed }) => [
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
                !reduceMotionEnabled && pressed && styles.favoritePressed,
              ]}
            >
              <MaterialCommunityIcons
                color={
                  isFavorite ? soloSurface.card.favoriteActiveIcon : soloSurface.card.favoriteIcon
                }
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
              />
            </Pressable>
          </View>

          <Typography allowFontScaling={false} color={soloSurface.card.body} style={styles.body}>
            {item.body}
          </Typography>

          <Typography
            allowFontScaling={false}
            color={soloSurface.card.detail}
            variant="Body"
            weight="bold"
          >
            {`${item.durationMinutes} min - ${categoryLabel}`}
          </Typography>
          <Typography allowFontScaling={false} color={soloSurface.card.meta} variant="Caption">
            {`${item.startsCount} starts`}
          </Typography>

          <View style={styles.cta}>
            <Typography
              allowFontScaling={false}
              color={soloSurface.card.ctaText}
              style={styles.ctaText}
              variant="Caption"
              weight="bold"
            >
              Begin prayer
            </Typography>
            <MaterialCommunityIcons color={soloSurface.card.ctaText} name="arrow-right" size={16} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: {
    lineHeight: 17,
    minHeight: 58,
  },
  card: {
    gap: spacing.xs,
    minHeight: 220,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  cardFeatured: {
    backgroundColor: soloSurface.card.featuredBackground,
    borderColor: soloSurface.card.featuredBorder,
    borderWidth: 1,
  },
  cardPressed: {
    opacity: interaction.card.pressedOpacity,
    transform: [{ scale: interaction.card.pressedScale }],
  },
  cardRegular: {
    backgroundColor: soloSurface.card.itemBackground,
    borderColor: soloSurface.card.itemBorder,
    borderWidth: 1,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: soloSurface.card.ctaBackground,
    borderColor: soloSurface.card.ctaBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  ctaText: {
    textTransform: 'none',
  },
  favoriteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: soloSurface.card.favoriteBackground,
    borderColor: soloSurface.card.favoriteBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 36,
  },
  favoriteButtonActive: {
    backgroundColor: soloSurface.card.favoriteActiveBackground,
    borderColor: soloSurface.card.favoriteActiveBorder,
  },
  favoritePressed: {
    transform: [{ scale: interaction.iconButton.pressedScale }],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  noMotion: {
    opacity: 1,
  },
  title: {
    flex: 1,
    lineHeight: 24,
  },
});
