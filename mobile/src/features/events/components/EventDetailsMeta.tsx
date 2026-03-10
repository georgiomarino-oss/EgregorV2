import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PremiumLiveEventCardSurface } from '../../../components/CinematicPrimitives';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { resolveCinematicArt } from '../../../lib/art/cinematicArt';
import { radii, sectionVisualThemes, spacing } from '../../../theme/tokens';

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
  return (
    <View style={styles.tile}>
      <Typography color={sectionVisualThemes.live.nav.labelIdle} variant="Label" weight="bold">
        {label}
      </Typography>
      <Typography color={sectionVisualThemes.live.nav.labelActive} variant="Body" weight="bold">
        {value}
      </Typography>
    </View>
  );
}

export function EventDetailsMeta({ children, helper, heading, items }: EventDetailsMetaProps) {
  return (
    <PremiumLiveEventCardSurface
      accessibilityLabel={helper ? `${heading}. ${helper}` : heading}
      artSource={resolveCinematicArt('live.card.default')}
      fallbackIcon="calendar-clock"
      fallbackLabel="Live metadata"
      section="live"
      style={styles.panel}
    >
      <SectionHeader
        compact
        subtitle={helper}
        subtitleColor={sectionVisualThemes.live.nav.labelIdle}
        title={heading}
        titleColor={sectionVisualThemes.live.nav.labelActive}
      />

      <View style={styles.tilesWrap}>
        {items.map((item) => (
          <MetaTile key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      {children}
    </PremiumLiveEventCardSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: sectionVisualThemes.live.surface.card[1],
    borderColor: sectionVisualThemes.live.surface.edge,
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
