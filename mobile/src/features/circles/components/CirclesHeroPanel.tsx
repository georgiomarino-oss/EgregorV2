import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import { radii, spacing } from '../../../theme/tokens';

interface CirclesHeroPanelProps {
  myCount: number;
  pendingCount: number;
  sharedCount: number;
}

export function CirclesHeroPanel({ myCount, pendingCount, sharedCount }: CirclesHeroPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.headlineRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            color="rgba(214, 244, 255, 0.95)"
            name="account-group"
            size={18}
          />
        </View>
        <View style={styles.titleWrap}>
          <Typography variant="H1" weight="bold">
            Circles
          </Typography>
          <Typography color="rgba(182, 213, 228, 0.9)" variant="Caption">
            Manage your memberships, shared circles, and invites in one place.
          </Typography>
        </View>
      </View>
      <View style={styles.chipsRow}>
        <StatusChip label={`${myCount} my circles`} tone="success" uppercase={false} />
        <StatusChip label={`${sharedCount} shared`} tone="upcoming" uppercase={false} />
        <StatusChip label={`${pendingCount} pending invites`} tone="warning" uppercase={false} />
      </View>
    </View>
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
    backgroundColor: 'rgba(27, 53, 69, 0.9)',
    borderColor: 'rgba(116, 170, 201, 0.64)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  panel: {
    backgroundColor: 'rgba(12, 31, 47, 0.72)',
    borderColor: 'rgba(111, 166, 198, 0.55)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
});

export type { CirclesHeroPanelProps };
