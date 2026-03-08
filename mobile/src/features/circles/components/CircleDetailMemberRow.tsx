import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../../components/Button';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import type { CircleMemberRecord } from '../../../lib/api/circles';
import { radii, spacing } from '../../../theme/tokens';
import { toRoleLabel } from '../invitePresentation';

interface CircleDetailMemberRowProps {
  isCurrentUser: boolean;
  member: CircleMemberRecord;
  onManage: (member: CircleMemberRecord) => void;
  showManage: boolean;
}

export function CircleDetailMemberRow({
  isCurrentUser,
  member,
  onManage,
  showManage,
}: CircleDetailMemberRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Typography variant="Caption" weight="bold">
          {member.displayName.slice(0, 1).toUpperCase()}
        </Typography>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Typography numberOfLines={1} variant="Body" weight="bold">
            {member.displayName}
          </Typography>
          {isCurrentUser ? <StatusChip label="You" tone="upcoming" uppercase={false} /> : null}
        </View>
        <View style={styles.metaRow}>
          <StatusChip
            label={member.isOwner ? 'Owner' : toRoleLabel(member.role)}
            tone={member.isOwner ? 'success' : 'neutral'}
            uppercase={false}
          />
          <Typography color="rgba(162, 197, 219, 0.86)" variant="Caption">
            Joined {new Date(member.joinedAt).toLocaleDateString()}
          </Typography>
        </View>
      </View>
      {showManage && !member.isOwner ? (
        <Button onPress={() => onManage(member)} title="Manage" variant="ghost" />
      ) : (
        <MaterialCommunityIcons
          color="rgba(155, 191, 215, 0.72)"
          name="check-circle-outline"
          size={18}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(29, 56, 74, 0.88)',
    borderColor: 'rgba(132, 178, 204, 0.5)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'rgba(14, 33, 48, 0.65)',
    borderColor: 'rgba(118, 168, 197, 0.42)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

export type { CircleDetailMemberRowProps };
