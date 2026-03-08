import type { ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityRole } from 'react-native';

import { crossApp, spacing } from '../theme/tokens';
import { Typography } from './Typography';

interface SectionHeaderProps {
  eyebrow?: string | undefined;
  leading?: ReactNode;
  subtitle?: string | undefined;
  title: string;
  trailing?: ReactNode;
  eyebrowColor?: string | undefined;
  compact?: boolean;
  subtitleColor?: string | undefined;
  titleColor?: string | undefined;
  titleRole?: AccessibilityRole;
}

export function SectionHeader({
  eyebrow,
  eyebrowColor,
  compact = false,
  leading,
  subtitle,
  subtitleColor,
  title,
  titleColor,
  titleRole = 'header',
  trailing,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.titleBlock, compact ? styles.titleBlockCompact : styles.titleBlockBase]}>
        {eyebrow ? (
          <Typography
            style={styles.eyebrow}
            variant="Caption"
            weight="bold"
            {...(eyebrowColor ? { color: eyebrowColor } : {})}
          >
            {eyebrow}
          </Typography>
        ) : null}

        <View style={styles.titleRow}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          <Typography
            accessibilityRole={titleRole}
            variant="H2"
            weight="bold"
            {...(titleColor ? { color: titleColor } : {})}
          >
            {title}
          </Typography>
        </View>

        {subtitle ? (
          <Typography
            variant="Caption"
            {...(subtitleColor ? { color: subtitleColor } : {})}
          >
            {subtitle}
          </Typography>
        ) : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    textTransform: 'none',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  titleBlockBase: {
    gap: crossApp.rhythm.compactGap,
  },
  titleBlockCompact: {
    gap: spacing.xxs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  trailing: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
});

export type { SectionHeaderProps };
