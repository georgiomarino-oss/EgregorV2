import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { colors, typography } from '../lib/theme/tokens';

type TypographyVariant = 'hero' | 'title' | 'bodyLg' | 'body' | 'caption';

interface TypographyProps extends TextProps {
  children: ReactNode;
  color?: string;
  variant?: TypographyVariant;
  weight?: 'regular' | 'semibold' | 'display';
}

const variantStyleMap = {
  hero: { fontSize: typography.size.hero, lineHeight: typography.lineHeight.hero },
  title: { fontSize: typography.size.title, lineHeight: typography.lineHeight.title },
  bodyLg: { fontSize: typography.size.bodyLg, lineHeight: typography.lineHeight.bodyLg },
  body: { fontSize: typography.size.body, lineHeight: typography.lineHeight.body },
  caption: { fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption },
} as const;

const weightStyleMap = {
  regular: typography.family.body,
  semibold: typography.family.bodySemibold,
  display: typography.family.display,
} as const;

export function Typography({
  children,
  color = colors.textPrimary,
  style,
  variant = 'body',
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
