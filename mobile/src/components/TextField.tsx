import { useMemo } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { figmaV2Reference } from '../theme/figma-v2-reference';
import { radii, spacing, typography } from '../theme/tokens';
import { Typography } from './Typography';

interface TextFieldProps extends TextInputProps {
  helperText?: string;
  label: string;
  message?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function TextField({ helperText, label, message, style, ...inputProps }: TextFieldProps) {
  const hasMessage = Boolean(message && message.trim().length > 0);
  const computedAccessibilityHint = useMemo(() => {
    const parts = [helperText, hasMessage ? message : undefined].filter(Boolean);
    return parts.length > 0 ? parts.join('. ') : undefined;
  }, [hasMessage, helperText, message]);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.labelRow}>
        <Typography variant="Label">{label}</Typography>
        {helperText ? (
          <Typography color={figmaV2Reference.text.caption} variant="Caption">
            {helperText}
          </Typography>
        ) : null}
      </View>

      <TextInput
        placeholderTextColor={figmaV2Reference.text.body}
        style={styles.input}
        {...inputProps}
        accessibilityHint={inputProps.accessibilityHint ?? computedAccessibilityHint}
      />

      {hasMessage ? (
        <Typography color={figmaV2Reference.text.caption} variant="Caption">
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
