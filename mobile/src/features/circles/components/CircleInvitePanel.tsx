import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SectionHeader } from '../../../components/SectionHeader';
import { circleSurface, radii, spacing } from '../../../theme/tokens';

type CircleVariant = 'prayer' | 'events';

interface CircleInvitePanelProps {
  children: ReactNode;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
  subtitle?: string;
  title: string;
  variant: CircleVariant;
}

export function CircleInvitePanel({
  children,
  iconName,
  style,
  subtitle,
  title,
  variant,
}: CircleInvitePanelProps) {
  const palette = circleSurface[variant].invite;
  const memberPalette = circleSurface[variant].member;

  return (
    <View
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityRole="summary"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor: palette.panelBackground,
          borderColor: palette.panelBorder,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <SectionHeader
          compact
          leading={
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.iconWrap,
                {
                  backgroundColor: memberPalette.avatarBackground,
                  borderColor: memberPalette.avatarBorder,
                },
              ]}
            >
              <MaterialCommunityIcons color={memberPalette.avatarText} name={iconName} size={16} />
            </View>
          }
          subtitle={subtitle}
          subtitleColor={palette.subtitle}
          title={title}
          titleColor={palette.title}
        />
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
