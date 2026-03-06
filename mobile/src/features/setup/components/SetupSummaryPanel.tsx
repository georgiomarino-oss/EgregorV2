import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { handoffSurface, motion, radii, spacing } from '../../../theme/tokens';

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
  const palette = handoffSurface.soloSetup.summary;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: palette.tileBackground,
          borderColor: palette.tileBorder,
        },
      ]}
    >
      <Typography allowFontScaling={false} color={palette.tileLabel} variant="Label" weight="bold">
        {label}
      </Typography>
      <Typography allowFontScaling={false} color={palette.tileValue} variant="H2" weight="bold">
        {value}
      </Typography>
    </View>
  );
}

export function SetupSummaryPanel({ errorMessage, items, loading }: SetupSummaryPanelProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);
  const palette = handoffSurface.soloSetup;

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
    <Animated.View
      accessibilityLabel="Session readiness. Review your selected duration, breath mode, ambient setting, and voice preference before starting."
      accessibilityRole="summary"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor: palette.summary.panelBackground,
          borderColor: palette.summary.panelBorder,
        },
        settleStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: palette.summary.panelGlow }]}
      />

      <SectionHeader
        compact
        subtitle="Your saved defaults are applied to this room."
        subtitleColor={palette.summary.helperText}
        title="Session readiness"
        titleColor={palette.summary.heading}
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

      <View
        style={[
          styles.readiness,
          {
            backgroundColor: palette.summary.readinessBackground,
            borderColor: palette.summary.readinessBorder,
          },
        ]}
      >
        <Typography
          allowFontScaling={false}
          color={palette.summary.readinessText}
          variant="Caption"
          weight="bold"
        >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    minHeight: 44,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingCard: {
    backgroundColor: handoffSurface.soloSetup.summary.panelBackground,
    borderColor: handoffSurface.soloSetup.summary.panelBorder,
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
  readiness: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tile: {
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
