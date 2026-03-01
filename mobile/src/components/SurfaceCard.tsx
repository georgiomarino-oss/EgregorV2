import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '../lib/theme/tokens';

interface SurfaceCardProps extends ViewProps {
  children: ReactNode;
}

export function SurfaceCard({ children, style, ...props }: SurfaceCardProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
});
