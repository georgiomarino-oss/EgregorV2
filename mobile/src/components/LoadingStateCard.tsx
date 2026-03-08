import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { crossApp, feedbackSurface, motion, radii, spacing } from '../theme/tokens';
import { SkeletonBlock } from './SkeletonBlock';
import { Typography } from './Typography';

interface LoadingStateCardProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  compact?: boolean;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title?: string;
}

export function LoadingStateCard({
  accessibilityHint,
  accessibilityLabel,
  compact = false,
  minHeight,
  style,
  subtitle = 'Syncing the latest data for this view.',
  title = 'Loading',
}: LoadingStateCardProps) {
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
          outputRange: [crossApp.motion.baseEnterOpacity, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [crossApp.motion.cardEnterOffsetY, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].join('. ')}
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor: feedbackSurface.loadingPanelBackground,
          borderColor: feedbackSurface.loadingPanelBorder,
          minHeight: minHeight ?? (compact ? 84 : 116),
        },
        style,
        settleStyle,
      ]}
    >
      <View style={styles.headerRow}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.iconWrap}
        >
          <ActivityIndicator color={feedbackSurface.iconTint} />
        </View>
        <View style={styles.headerTextWrap}>
          <Typography
            color={feedbackSurface.loadingTitle}
            variant="Body"
            weight="bold"
          >
            {title}
          </Typography>
          <Typography
            color={feedbackSurface.loadingBody}
            variant="Caption"
          >
            {subtitle}
          </Typography>
        </View>
      </View>

      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.skeletonRow}
      >
        <SkeletonBlock height={9} width="92%" />
        <SkeletonBlock height={9} width="74%" />
        {!compact ? <SkeletonBlock height={9} width="58%" /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: feedbackSurface.iconBackground,
    borderColor: feedbackSurface.iconBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    borderRadius: crossApp.emptyState.borderRadius,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  skeletonRow: {
    gap: spacing.xs,
  },
});

export type { LoadingStateCardProps };
