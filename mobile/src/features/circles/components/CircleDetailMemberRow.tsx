import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../../components/Button';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import type { CircleMemberRecord } from '../../../lib/api/circles';
import { radii, sectionVisualThemes, spacing } from '../../../theme/tokens';
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
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
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
    backgroundColor: sectionVisualThemes.circles.surface.card[0],
    borderColor: sectionVisualThemes.circles.media.frameBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
    backgroundColor: sectionVisualThemes.circles.surface.card[1],
    borderColor: sectionVisualThemes.circles.surface.edge,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 68,
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
