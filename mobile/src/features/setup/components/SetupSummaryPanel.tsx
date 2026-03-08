import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { PremiumPrayerCardSurface } from '../../../components/CinematicPrimitives';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { motion, radii, sectionVisualThemes, soloSurface, spacing } from '../../../theme/tokens';

interface SetupSummaryItem {
  label: string;
  value: string;
}

interface SetupSummaryPanelProps {
  errorMessage?: string | null;
  items: readonly SetupSummaryItem[];
  loading: boolean;
}

function SetupTile({ label, value }: SetupSummaryItem) {
  return (
    <View style={styles.tile}>
      <Typography color={sectionVisualThemes.solo.nav.labelIdle} variant="Label" weight="bold">
        {label}
      </Typography>
      <Typography color={soloSurface.card.title} variant="H2" weight="bold">
        {value}
      </Typography>
    </View>
  );
}

export function SetupSummaryPanel({ errorMessage, items, loading }: SetupSummaryPanelProps) {
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
    <Animated.View style={settleStyle}>
      <PremiumPrayerCardSurface
        fallbackIcon="star-outline"
        fallbackLabel="Session readiness"
        section="solo"
        style={styles.panel}
      >
        <SectionHeader
          compact
          subtitle="Your saved defaults are applied to this room."
          subtitleColor={sectionVisualThemes.solo.nav.labelIdle}
          title="Session readiness"
          titleColor={soloSurface.card.title}
        />

        {loading ? (
          <LoadingStateCard
            compact
            minHeight={120}
            subtitle="Syncing your saved prayer setup."
            style={styles.loadingCard}
            title="Preparing setup"
          />
        ) : (
          <View style={styles.tilesWrap}>
            {items.map((item) => (
              <SetupTile key={item.label} label={item.label} value={item.value} />
            ))}
          </View>
        )}

        <View style={styles.readiness}>
          <Typography color={soloSurface.card.ctaText} variant="Caption" weight="bold">
            Ready to enter your solo room.
          </Typography>
        </View>

        {errorMessage ? (
          <InlineErrorCard
            message={errorMessage}
            style={styles.errorCard}
            title="Could not load setup details"
          />
        ) : null}
      </PremiumPrayerCardSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    minHeight: 44,
  },
  loadingCard: {
    backgroundColor: sectionVisualThemes.solo.surface.card[1],
    borderColor: sectionVisualThemes.solo.surface.border,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    gap: spacing.sm,
  },
  readiness: {
    alignSelf: 'flex-start',
    backgroundColor: soloSurface.card.ctaBackground,
    borderColor: soloSurface.card.ctaBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tile: {
    backgroundColor: sectionVisualThemes.solo.surface.card[0],
    borderColor: sectionVisualThemes.solo.surface.edge,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xxs,
    minHeight: 74,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
