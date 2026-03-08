import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { StatusChip } from '../../../components/StatusChip';
import { SurfaceCard } from '../../../components/SurfaceCard';
import { SurfaceListRow } from '../../../components/SurfaceListRow';
import { Typography } from '../../../components/Typography';
import type { CanonicalCircleSummary } from '../../../lib/api/circles';
import { radii, spacing } from '../../../theme/tokens';
import { toRoleLabel } from '../invitePresentation';

interface CircleSummaryCardProps {
  circle: CanonicalCircleSummary;
  onPress: (circle: CanonicalCircleSummary) => void;
}

export function CircleSummaryCard({ circle, onPress }: CircleSummaryCardProps) {
  return (
    <SurfaceCard contentPadding={0} radius="lg" variant="profileRow">
      <SurfaceListRow
        leading={
          <MaterialCommunityIcons
            color="rgba(204, 231, 248, 0.95)"
            name="account-group"
            size={20}
          />
        }
        onPress={() => onPress(circle)}
        style={styles.row}
        trailing={
          <MaterialCommunityIcons color="rgba(174, 208, 231, 0.8)" name="chevron-right" size={22} />
        }
      >
        <View style={styles.content}>
          <Typography numberOfLines={1} variant="Body" weight="bold">
            {circle.name}
          </Typography>
          <Typography color="rgba(185, 212, 228, 0.88)" numberOfLines={2} variant="Caption">
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
    </SurfaceCard>
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
  row: {
    borderRadius: radii.xl,
    minHeight: 82,
    paddingVertical: spacing.sm,
  },
});

export type { CircleSummaryCardProps };
