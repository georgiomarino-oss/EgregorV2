import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../lib/theme/tokens';
import { Typography } from './Typography';

type ButtonVariant = 'primary' | 'secondary';

interface AppButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
}

export function AppButton({
  disabled = false,
  loading = false,
  onPress,
  title,
  variant = 'primary',
}: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator
            color={isPrimary ? colors.buttonPrimaryText : colors.buttonSecondaryText}
          />
        </View>
      ) : (
        <Typography
          color={isPrimary ? colors.buttonPrimaryText : colors.buttonSecondaryText}
          style={styles.label}
          variant="body"
          weight="semibold"
        >
          {title}
        </Typography>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    letterSpacing: 0.3,
  },
  loaderWrap: {
    minHeight: 24,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  primary: {
    backgroundColor: colors.buttonPrimary,
  },
  secondary: {
    backgroundColor: colors.buttonSecondary,
    borderColor: colors.border,
    borderWidth: 1,
  },
});
