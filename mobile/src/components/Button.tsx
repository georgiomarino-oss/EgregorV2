import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { interaction, radii } from '../theme/tokens';
import { Typography } from './Typography';

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'sky';

interface ButtonProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
}

const gradientByVariant: Record<
  ButtonVariant,
  { colors: readonly [string, string]; locations: readonly [number, number] }
> = {
  primary: {
    colors: [figmaV2Reference.buttons.mint.from, figmaV2Reference.buttons.mint.to],
    locations: [0, 1],
  },
  secondary: {
    colors: [
      figmaV2Reference.buttons.secondary.background,
      figmaV2Reference.buttons.secondary.background,
    ],
    locations: [0, 1],
  },
  gold: {
    colors: [figmaV2Reference.buttons.gold.from, figmaV2Reference.buttons.gold.to],
    locations: [0, 1],
  },
  sky: {
    colors: [figmaV2Reference.buttons.sky.from, figmaV2Reference.buttons.sky.to],
    locations: [0, 1],
  },
};

const textColorByVariant: Record<ButtonVariant, string> = {
  primary: figmaV2Reference.buttons.mint.text,
  secondary: figmaV2Reference.buttons.secondary.text,
  gold: figmaV2Reference.buttons.gold.text,
  sky: figmaV2Reference.buttons.sky.text,
};

export function Button({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled = false,
  loading = false,
  onPress,
  title,
  variant = 'primary',
}: ButtonProps) {
  const reduceMotionEnabled = useReducedMotion();
  const isBusy = disabled || loading;
  const resolvedAccessibilityLabel = accessibilityLabel ?? title;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ busy: loading, disabled: isBusy }}
      disabled={isBusy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        isBusy
          ? {
              opacity: loading
                ? interaction.button.loadingOpacity
                : interaction.button.disabledOpacity,
            }
          : null,
        !reduceMotionEnabled && pressed && styles.pressedScale,
      ]}
    >
      {({ pressed }) => {
        const showOverlay = pressed || isBusy;

        return (
          <LinearGradient
            colors={gradientByVariant[variant].colors}
            end={{ x: 1, y: 0 }}
            locations={gradientByVariant[variant].locations}
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
                <ActivityIndicator
                  accessible={false}
                  color={textColorByVariant[variant]}
                  importantForAccessibility="no"
                />
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

            {showOverlay ? (
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={[
                  styles.stateOverlay,
                  (disabled || loading) && styles.disabledOverlay,
                  pressed && styles.pressedOverlay,
                ]}
              />
            ) : null}
          </LinearGradient>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabledOverlay: {
    backgroundColor: figmaV2Reference.overlays.disabled,
  },
  goldBorder: {
    borderColor: figmaV2Reference.buttons.gold.border,
    borderWidth: 0.8,
  },
  gradient: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: interaction.button.minHeight,
    paddingHorizontal: interaction.button.paddingX,
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
  pressedOverlay: {
    backgroundColor: figmaV2Reference.overlays.pressed,
  },
  pressedScale: {
    transform: [{ scale: interaction.button.pressedScale }],
  },
  pressable: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  secondaryBorder: {
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderWidth: 0.8,
  },
  skyBorder: {
    borderColor: figmaV2Reference.buttons.sky.border,
    borderWidth: 0.8,
  },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export type { ButtonProps, ButtonVariant };
