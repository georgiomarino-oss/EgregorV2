import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, crossApp, radii, spacing } from '../theme/tokens';

interface ModalSheetProps {
  children: ReactNode;
  onBackdropPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ModalSheet({ children, onBackdropPress, style }: ModalSheetProps) {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Dismiss sheet"
        accessibilityRole="button"
        onPress={onBackdropPress}
        style={styles.backdrop}
      />
      <View style={[styles.sheet, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  sheet: {
    backgroundColor: 'rgba(9, 30, 46, 0.95)',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: crossApp.section.borderWidth,
    borderColor: 'rgba(111, 163, 194, 0.52)',
    gap: spacing.sm,
    minHeight: 120,
    paddingHorizontal: crossApp.section.paddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});

export type { ModalSheetProps };
