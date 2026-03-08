import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { crossApp, radii, spacing } from '../theme/tokens';
import { Typography } from './Typography';

interface EmptyStateCardProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  backgroundColor: string;
  body?: string | undefined;
  borderColor: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconTint?: string | undefined;
  iconBackgroundColor?: string | undefined;
  iconBorderColor?: string | undefined;
  title: string;
  bodyColor?: string | undefined;
  titleColor?: string | undefined;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyStateCard({
  accessibilityHint,
  accessibilityLabel,
  action,
  backgroundColor,
  body,
  bodyColor,
  borderColor,
  iconBackgroundColor,
  iconBorderColor,
  iconName,
  iconTint,
  style,
  title,
  titleColor,
}: EmptyStateCardProps) {
  const resolvedAccessibilityLabel = accessibilityLabel ?? [title, body].filter(Boolean).join('. ');

  return (
    <View
      accessibilityHint={accessibilityHint}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="summary"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {iconName ? (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.iconWrap,
            {
              backgroundColor: iconBackgroundColor,
              borderColor: iconBorderColor,
            },
          ]}
        >
          <MaterialCommunityIcons color={iconTint} name={iconName} size={18} />
        </View>
      ) : null}

      <View style={styles.content}>
        <Typography
          variant="Body"
          weight="bold"
          {...(titleColor ? { color: titleColor } : {})}
        >
          {title}
        </Typography>
        {body ? (
          <Typography
            style={styles.body}
            variant="Caption"
            {...(bodyColor ? { color: bodyColor } : {})}
          >
            {body}
          </Typography>
        ) : null}
      </View>

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.xxs,
  },
  body: {
    lineHeight: 17,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  panel: {
    alignItems: 'center',
    borderRadius: crossApp.emptyState.borderRadius,
    borderWidth: crossApp.emptyState.borderWidth,
    flexDirection: 'row',
    gap: crossApp.emptyState.contentGap,
    minHeight: crossApp.emptyState.minHeight,
    paddingHorizontal: crossApp.emptyState.paddingX,
    paddingVertical: crossApp.emptyState.paddingY,
  },
});

export type { EmptyStateCardProps };
