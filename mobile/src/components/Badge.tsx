import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { crossApp, radii, semanticState, spacing } from '../theme/tokens';
import { Typography } from './Typography';

type BadgeTone = 'active' | 'disabled' | 'error' | 'loading' | 'success' | 'warning';

interface BadgeProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  tone?: BadgeTone;
}

export function Badge({ label, style, tone = 'active' }: BadgeProps) {
  const palette = semanticState[tone];

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      accessible
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <Typography color={palette.text} variant="Caption" weight="bold">
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: crossApp.statusChip.borderWidth,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
});

export type { BadgeProps, BadgeTone };
