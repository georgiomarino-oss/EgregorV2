import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { radii, soloSurface, spacing } from '../../../theme/tokens';

interface SoloSectionProps {
  children: ReactNode;
  countLabel: string;
  subtitle?: string;
  title: string;
}

export function SoloSection({ children, countLabel, subtitle, title }: SoloSectionProps) {
  return (
    <View style={styles.panel}>
      <SectionHeader
        subtitle={subtitle}
        subtitleColor={soloSurface.section.subtitle}
        title={title}
        titleColor={soloSurface.section.title}
        trailing={
          <Typography
            allowFontScaling={false}
            color={soloSurface.section.count}
            variant="Caption"
            weight="bold"
          >
            {countLabel}
          </Typography>
        }
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: soloSurface.section.panelBackground,
    borderColor: soloSurface.section.panelBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
});
