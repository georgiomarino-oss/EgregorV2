import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { semanticState, spacing } from '../theme/tokens';
import { Typography } from './Typography';

type AlertTone = 'error' | 'warning' | 'success';

interface AlertBannerProps {
  action?: ReactNode;
  message: string;
  style?: StyleProp<ViewStyle>;
  title: string;
  tone?: AlertTone;
}

export function AlertBanner({ action, message, style, title, tone = 'warning' }: AlertBannerProps) {
  const palette = semanticState[tone];

  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <View style={styles.textWrap}>
        <Typography color={palette.text} variant="Body" weight="bold">
          {title}
        </Typography>
        <Typography color={palette.text} variant="Caption">
          {message}
        </Typography>
      </View>

      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textWrap: {
    gap: spacing.xxs,
  },
});

export type { AlertBannerProps, AlertTone };
