import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PremiumHeroPanel } from '../../../components/CinematicPrimitives';
import { LiveLogo } from '../../../components/LiveLogo';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { communitySurface, radii, sectionVisualThemes, spacing } from '../../../theme/tokens';

interface CirclesHeroPanelProps {
  myCount: number;
  pendingCount: number;
  sharedCount: number;
}

export function CirclesHeroPanel({ myCount, pendingCount, sharedCount }: CirclesHeroPanelProps) {
  return (
    <PremiumHeroPanel
      fallbackIcon="account-group-outline"
      fallbackLabel="Circle constellation"
      section="circles"
      style={styles.panel}
    >
      <View style={styles.headlineRow}>
        <View style={styles.iconWrap}>
          <LiveLogo context="community" size={14} />
          <MaterialCommunityIcons
            color={communitySurface.hero.badgeText}
            name="account-group"
            size={14}
          />
        </View>
        <View style={styles.titleWrap}>
          <Typography color={communitySurface.metrics.primaryValue} variant="H1" weight="bold">
            Circles
          </Typography>
          <Typography color={communitySurface.hero.subtitle} variant="Caption">
            Manage your memberships, shared circles, and invites in one place.
          </Typography>
        </View>
      </View>
      <View style={styles.chipsRow}>
        <StatusChip label={`${myCount} my circles`} tone="success" uppercase={false} />
        <StatusChip label={`${sharedCount} shared`} tone="upcoming" uppercase={false} />
        <StatusChip label={`${pendingCount} pending invites`} tone="warning" uppercase={false} />
      </View>
    </PremiumHeroPanel>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: sectionVisualThemes.circles.surface.card[0],
    borderColor: sectionVisualThemes.circles.surface.edge,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  panel: {
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
});

export type { CirclesHeroPanelProps };
