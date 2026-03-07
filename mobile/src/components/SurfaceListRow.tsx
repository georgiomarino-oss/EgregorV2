import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { interaction, radii, spacing } from '../theme/tokens';

interface SurfaceListRowProps {
  leading?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
  children: ReactNode;
}

export function SurfaceListRow({
  children,
  leading,
  onPress,
  style,
  trailing,
}: SurfaceListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null, style]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>{children}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  leading: {
    marginRight: spacing.xs,
  },
  pressed: {
    opacity: interaction.card.pressedOpacity,
    transform: [{ scale: interaction.card.pressedScale }],
  },
  row: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});

export type { SurfaceListRowProps };
