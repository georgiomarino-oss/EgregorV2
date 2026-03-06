import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { crossApp, interaction, statusChipPalette } from '../theme/tokens';
import { Typography } from './Typography';

type StatusChipTone =
  | 'danger'
  | 'live'
  | 'neutral'
  | 'scheduled'
  | 'soon'
  | 'success'
  | 'template'
  | 'upcoming'
  | 'warning';

interface StatusChipColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

interface StatusChipProps {
  accessibilityLabel?: string;
  decorative?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  tone?: StatusChipTone;
  uppercase?: boolean;
  colors?: StatusChipColors;
}

export function StatusChip({
  accessibilityLabel,
  colors,
  decorative = true,
  label,
  labelStyle,
  style,
  tone = 'neutral',
  uppercase = true,
}: StatusChipProps) {
  const palette = colors ?? statusChipPalette[tone];
  const isEmphasizedTone = tone === 'live' || tone === 'soon' || tone === 'upcoming';

  return (
    <View
      accessibilityLabel={decorative ? undefined : (accessibilityLabel ?? label)}
      accessibilityRole={decorative ? undefined : 'text'}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[
        styles.chip,
        isEmphasizedTone && styles.emphasizedChip,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <Typography
        allowFontScaling={false}
        color={palette.textColor}
        style={[styles.label, uppercase && styles.labelUppercase, labelStyle]}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: crossApp.statusChip.borderRadius,
    borderWidth: crossApp.statusChip.borderWidth,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: crossApp.statusChip.paddingX,
    paddingVertical: crossApp.statusChip.paddingY,
  },
  emphasizedChip: {
    transform: [{ scale: interaction.liveEmphasisScale }],
  },
  label: {
    textTransform: 'none',
  },
  labelUppercase: {
    textTransform: 'uppercase',
  },
});

export type { StatusChipColors, StatusChipProps, StatusChipTone };
