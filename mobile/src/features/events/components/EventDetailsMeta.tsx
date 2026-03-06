import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { handoffSurface, radii, spacing } from '../../../theme/tokens';

export interface EventDetailsMetaItem {
  label: string;
  value: string;
}

interface EventDetailsMetaProps {
  children?: ReactNode;
  helper?: string;
  heading: string;
  items: readonly EventDetailsMetaItem[];
}

function MetaTile({ label, value }: EventDetailsMetaItem) {
  const palette = handoffSurface.eventDetails.meta;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: palette.tileBackground,
          borderColor: palette.tileBorder,
        },
      ]}
    >
      <Typography allowFontScaling={false} color={palette.tileLabel} variant="Label" weight="bold">
        {label}
      </Typography>
      <Typography allowFontScaling={false} color={palette.tileValue} variant="Body" weight="bold">
        {value}
      </Typography>
    </View>
  );
}

export function EventDetailsMeta({ children, helper, heading, items }: EventDetailsMetaProps) {
  const palette = handoffSurface.eventDetails.meta;

  return (
    <View
      accessibilityLabel={helper ? `${heading}. ${helper}` : heading}
      accessibilityRole="summary"
      accessible
      style={[
        styles.panel,
        {
          backgroundColor: palette.panelBackground,
          borderColor: palette.panelBorder,
        },
      ]}
    >
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: palette.panelGlow }]} />

      <SectionHeader
        compact
        subtitle={helper}
        subtitleColor={palette.helperText}
        title={heading}
        titleColor={palette.heading}
      />

      <View style={styles.tilesWrap}>
        {items.map((item) => (
          <MetaTile key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tile: {
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xxs,
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
