import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { crossApp } from '../theme/tokens';

interface ActionPanelProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  backgroundColor: string;
  borderColor: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ActionPanel({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  backgroundColor,
  borderColor,
  children,
  style,
}: ActionPanelProps) {
  return (
    <View
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessible={Boolean(accessibilityLabel)}
      style={[
        styles.panel,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: crossApp.action.borderRadius,
    borderWidth: crossApp.action.borderWidth,
    gap: crossApp.action.contentGap,
    paddingHorizontal: crossApp.action.paddingX,
    paddingVertical: crossApp.action.paddingY,
  },
});

export type { ActionPanelProps };
