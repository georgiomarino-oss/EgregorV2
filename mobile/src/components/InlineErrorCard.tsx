import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { crossApp, feedbackSurface, motion, radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

type InlineErrorTone = 'error' | 'warning';

interface InlineErrorCardProps {
  action?: ReactNode;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
  tone?: InlineErrorTone;
}

export function InlineErrorCard({
  action,
  accessibilityHint,
  accessibilityLabel,
  message,
  style,
  title,
  tone = 'error',
}: InlineErrorCardProps) {
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

  const palette =
    tone === 'warning'
      ? {
          body: feedbackSurface.warningBody,
          border: feedbackSurface.warningPanelBorder,
          panel: feedbackSurface.warningPanelBackground,
          title: feedbackSurface.warningTitle,
        }
      : {
          body: feedbackSurface.errorBody,
          border: feedbackSurface.errorPanelBorder,
          panel: feedbackSurface.errorPanelBackground,
          title: feedbackSurface.errorTitle,
        };

  const settleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: settle.interpolate({
          inputRange: [0, 1],
          outputRange: [crossApp.motion.subtleEnterOpacity, 1],
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
      accessibilityLabel={
        accessibilityLabel ??
        [title ?? (tone === 'warning' ? 'Attention needed' : 'Something went wrong'), message].join(
          '. ',
        )
      }
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      accessible
      style={[
        styles.card,
        {
          backgroundColor: palette.panel,
          borderColor: palette.border,
        },
        style,
        settleStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.iconWrap}
        >
          <MaterialCommunityIcons
            color={feedbackSurface.iconTint}
            name={tone === 'warning' ? 'alert-outline' : 'alert-circle-outline'}
            size={16}
          />
        </View>
        <View style={styles.textWrap}>
          <Typography color={palette.title} variant="Body" weight="bold">
            {title ?? (tone === 'warning' ? 'Attention needed' : 'Something went wrong')}
          </Typography>
          <Typography color={palette.body} variant="Caption">
            {message}
          </Typography>
        </View>
      </View>

      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.xxs,
  },
  card: {
    borderRadius: crossApp.emptyState.borderRadius,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: crossApp.emptyState.minHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: feedbackSurface.iconBackground,
    borderColor: feedbackSurface.iconBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  noMotion: {
    opacity: 1,
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

export type { InlineErrorCardProps, InlineErrorTone };
