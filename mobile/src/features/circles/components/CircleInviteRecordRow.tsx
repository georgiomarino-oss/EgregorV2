import { StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import type { CircleInviteRecord } from '../../../lib/api/circles';
import { radii, spacing } from '../../../theme/tokens';
import {
  formatInviteExpiry,
  toInviteStatusLabel,
  toInviteStatusTone,
  toRoleLabel,
} from '../invitePresentation';

interface CircleInviteRecordRowProps {
  invite: CircleInviteRecord;
  onRevoke: (invite: CircleInviteRecord) => void;
  revoking: boolean;
}

function getInviteTargetLabel(invite: CircleInviteRecord) {
  if (invite.targetContactLabel?.trim()) {
    return invite.targetContactLabel.trim();
  }

  if (invite.targetUserId) {
    return 'In-app user';
  }

  return 'Link recipient';
}

export function CircleInviteRecordRow({ invite, onRevoke, revoking }: CircleInviteRecordRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <Typography numberOfLines={1} variant="Body" weight="bold">
          {getInviteTargetLabel(invite)}
        </Typography>
        <StatusChip
          label={toInviteStatusLabel(invite.status)}
          tone={toInviteStatusTone(invite.status)}
          uppercase={false}
        />
      </View>
      <View style={styles.metaRow}>
        <StatusChip label={toRoleLabel(invite.roleToGrant)} tone="neutral" uppercase={false} />
        <Typography color="rgba(164, 197, 216, 0.88)" variant="Caption">
          {formatInviteExpiry(invite.expiresAt)}
        </Typography>
      </View>
      {invite.status === 'pending' ? (
        <Button
          loading={revoking}
          onPress={() => onRevoke(invite)}
          title="Revoke"
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  row: {
    backgroundColor: 'rgba(13, 31, 45, 0.64)',
    borderColor: 'rgba(110, 162, 193, 0.42)',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
});

export type { CircleInviteRecordRowProps };
