import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { figmaV2Reference } from '../theme/figma-v2-reference';
import { radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'sky';

interface ButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
}

const gradientByVariant: Record<ButtonVariant, readonly [string, string]> = {
  primary: [figmaV2Reference.buttons.mint.from, figmaV2Reference.buttons.mint.to],
  secondary: [
    figmaV2Reference.buttons.secondary.background,
    figmaV2Reference.buttons.secondary.background,
  ],
  gold: [figmaV2Reference.buttons.gold.from, figmaV2Reference.buttons.gold.to],
  sky: [figmaV2Reference.buttons.sky.from, figmaV2Reference.buttons.sky.to],
};

const textColorByVariant: Record<ButtonVariant, string> = {
  primary: figmaV2Reference.buttons.mint.text,
  secondary: figmaV2Reference.buttons.secondary.text,
  gold: figmaV2Reference.buttons.gold.text,
  sky: figmaV2Reference.buttons.sky.text,
};

export function Button({
  disabled = false,
  loading = false,
  onPress,
  title,
  variant = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={gradientByVariant[variant]}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={[
          styles.gradient,
          variant === 'secondary' && styles.secondaryBorder,
          variant === 'gold' && styles.goldBorder,
          variant === 'sky' && styles.skyBorder,
        ]}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={textColorByVariant[variant]} />
          </View>
        ) : (
          <Typography
            color={textColorByVariant[variant]}
            style={styles.label}
            variant="Label"
            weight="bold"
          >
            {title}
          </Typography>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.52,
  },
  goldBorder: {
    borderColor: figmaV2Reference.buttons.gold.border,
  },
  gradient: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 45,
    paddingHorizontal: spacing.lg,
  },
  label: {
    letterSpacing: 0.26,
    textTransform: 'none',
  },
  loader: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  pressable: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  secondaryBorder: {
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderWidth: 1,
  },
  skyBorder: {
    borderColor: figmaV2Reference.buttons.sky.border,
  },
});

export type { ButtonProps, ButtonVariant };
