import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PremiumCircleCardSurface } from '../../../components/CinematicPrimitives';
import { StatusChip } from '../../../components/StatusChip';
import { SurfaceListRow } from '../../../components/SurfaceListRow';
import { Typography } from '../../../components/Typography';
import { resolveCinematicArt } from '../../../lib/art/cinematicArt';
import type { CanonicalCircleSummary } from '../../../lib/api/circles';
import { radii, sectionVisualThemes, spacing } from '../../../theme/tokens';
import { toRoleLabel } from '../invitePresentation';

interface CircleSummaryCardProps {
  circle: CanonicalCircleSummary;
  onPress: (circle: CanonicalCircleSummary) => void;
}

export function CircleSummaryCard({ circle, onPress }: CircleSummaryCardProps) {
  return (
    <PremiumCircleCardSurface
      artSource={resolveCinematicArt('circles.card.default')}
      fallbackIcon="account-group"
      fallbackLabel="Shared circle"
      section="circles"
      style={styles.card}
    >
      <SurfaceListRow
        leading={
          <MaterialCommunityIcons
            color={sectionVisualThemes.circles.media.icon}
            name="account-group"
            size={20}
          />
        }
        onPress={() => onPress(circle)}
        style={styles.row}
        trailing={
          <MaterialCommunityIcons color={sectionVisualThemes.circles.nav.labelIdle} name="chevron-right" size={22} />
        }
      >
        <View style={styles.content}>
          <Typography numberOfLines={1} variant="Body" weight="bold">
            {circle.name}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} numberOfLines={2} variant="Caption">
            {circle.description?.trim() || 'No circle description yet.'}
          </Typography>
          <View style={styles.badges}>
            <StatusChip
              label={toRoleLabel(circle.membershipRole)}
              tone="neutral"
              uppercase={false}
            />
            {circle.isSharedWithMe ? (
              <StatusChip label="Shared with me" tone="upcoming" uppercase={false} />
            ) : (
              <StatusChip label="My circle" tone="success" uppercase={false} />
            )}
          </View>
        </View>
      </SurfaceListRow>
    </PremiumCircleCardSurface>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  content: {
    gap: spacing.xxs,
  },
  card: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  row: {
    borderRadius: radii.xl,
    minHeight: 82,
    paddingVertical: spacing.sm,
  },
});

export type { CircleSummaryCardProps };
