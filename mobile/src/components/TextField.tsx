import { useMemo, useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { SectionThemeKey } from '../theme/tokens';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { premiumInteraction, radii, sectionVisualThemes, spacing, typography } from '../theme/tokens';
import { Typography } from './Typography';

interface TextFieldProps extends TextInputProps {
  helperText?: string;
  label: string;
  message?: string | null;
  section?: SectionThemeKey;
  style?: StyleProp<ViewStyle>;
}

export function TextField({
  helperText,
  label,
  message,
  section,
  style,
  ...inputProps
}: TextFieldProps) {
  const hasMessage = Boolean(message && message.trim().length > 0);
  const [focused, setFocused] = useState(false);
  const sectionPalette = section ? sectionVisualThemes[section] : null;
  const computedAccessibilityHint = useMemo(() => {
    const parts = [helperText, hasMessage ? message : undefined].filter(Boolean);
    return parts.length > 0 ? parts.join('. ') : undefined;
  }, [hasMessage, helperText, message]);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.labelRow}>
        <Typography
          color={sectionPalette ? sectionPalette.nav.labelActive : figmaV2Reference.text.label}
          variant="Label"
        >
          {label}
        </Typography>
        {helperText ? (
          <Typography
            color={sectionPalette ? sectionPalette.nav.labelIdle : figmaV2Reference.text.caption}
            variant="Caption"
          >
            {helperText}
          </Typography>
        ) : null}
      </View>

      <TextInput
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        placeholderTextColor={figmaV2Reference.text.body}
        style={[
          styles.input,
          sectionPalette
            ? {
                backgroundColor: sectionPalette.surface.card[1],
                borderColor: focused
                  ? premiumInteraction.focus.ringColor
                  : sectionPalette.surface.border,
                borderWidth: focused
                  ? premiumInteraction.focus.ringWidth
                  : StyleSheet.hairlineWidth + 0.8,
                color: sectionPalette.nav.labelActive,
              }
            : null,
        ]}
        {...inputProps}
        accessibilityHint={inputProps.accessibilityHint ?? computedAccessibilityHint}
      />

      {hasMessage ? (
        <Typography
          color={sectionPalette ? sectionPalette.nav.labelIdle : figmaV2Reference.text.caption}
          variant="Caption"
        >
          {message}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: figmaV2Reference.inputs.auth.background,
    borderColor: figmaV2Reference.inputs.auth.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: figmaV2Reference.inputs.auth.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wrapper: {
    gap: spacing.xxs,
  },
});

export type { TextFieldProps };
