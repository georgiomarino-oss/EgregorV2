import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { navigationSurface, radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

interface ToastCardProps {
  message: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
}

export function ToastCard({ message, style, title = 'Notice' }: ToastCardProps) {
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessible
      style={[styles.wrap, style]}
    >
      <Typography variant="Caption" weight="bold">
        {title}
      </Typography>
      <Typography variant="Caption">{message}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    backgroundColor: navigationSurface.topBar.background,
    borderColor: navigationSurface.topBar.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    maxWidth: 320,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

export type { ToastCardProps };
