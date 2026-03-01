import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { colors, typography } from '../theme/tokens';

type TypographyVariant =
  | 'H1'
  | 'H2'
  | 'Body'
  | 'Caption'
  | 'Label'
  | 'Metric'
  | 'hero'
  | 'title'
  | 'bodyLg'
  | 'body'
  | 'caption';
type TypographyWeight = 'regular' | 'medium' | 'bold' | 'semibold' | 'display';

interface TypographyProps extends TextProps {
  children: ReactNode;
  color?: string;
  variant?: TypographyVariant;
  weight?: TypographyWeight;
}

const variantStyleMap = {
  H1: {
    fontSize: typography.size.h1,
    letterSpacing: typography.tracking.tight,
    lineHeight: typography.lineHeight.h1,
  },
  H2: {
    fontSize: typography.size.h2,
    lineHeight: typography.lineHeight.h2,
  },
  Body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  Caption: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
  },
  Label: {
    fontSize: typography.size.label,
    letterSpacing: typography.tracking.wide,
    lineHeight: typography.lineHeight.label,
    textTransform: 'uppercase' as const,
  },
  Metric: {
    fontSize: typography.size.metric,
    lineHeight: typography.lineHeight.metric,
  },
  hero: {
    fontSize: typography.size.h1,
    letterSpacing: typography.tracking.tight,
    lineHeight: typography.lineHeight.h1,
  },
  title: {
    fontSize: typography.size.h2,
    lineHeight: typography.lineHeight.h2,
  },
  bodyLg: {
    fontSize: typography.size.bodyLg,
    lineHeight: typography.lineHeight.bodyLg,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  caption: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
  },
} as const;

const weightStyleMap = {
  regular: typography.family.regular,
  medium: typography.family.medium,
  bold: typography.family.bold,
  semibold: typography.family.medium,
  display: typography.family.bold,
} as const;

export function Typography({
  children,
  color = colors.textPrimary,
  style,
  variant = 'Body',
  weight = 'regular',
  ...textProps
}: TypographyProps) {
  return (
    <Text
      {...textProps}
      style={[
        {
          color,
          fontFamily: weightStyleMap[weight],
        },
        variantStyleMap[variant],
        style,
      ]}
    >
      {children}
    </Text>
  );
}
