import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../../components/Button';
import { StatusChip } from '../../../components/StatusChip';
import { SurfaceCard } from '../../../components/SurfaceCard';
import { Typography } from '../../../components/Typography';
import type { CircleInviteSummary } from '../../../lib/api/circles';
import { radii, spacing } from '../../../theme/tokens';
import {
  formatInviteExpiry,
  toInviteStatusLabel,
  toInviteStatusTone,
  toRoleLabel,
} from '../invitePresentation';

interface CirclePendingInviteCardProps {
  invite: CircleInviteSummary;
  onReview: (invite: CircleInviteSummary) => void;
}

export function CirclePendingInviteCard({ invite, onReview }: CirclePendingInviteCardProps) {
  return (
    <SurfaceCard radius="lg" variant="profileRow">
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color="rgba(222, 243, 255, 0.9)" name="mail" size={16} />
        </View>
        <View style={styles.headerTextWrap}>
          <Typography numberOfLines={1} variant="Body" weight="bold">
            {invite.circleName}
          </Typography>
          <Typography color="rgba(177, 209, 226, 0.9)" numberOfLines={2} variant="Caption">
            Invited by {invite.inviterDisplayName}.
          </Typography>
        </View>
        <StatusChip
          label={toInviteStatusLabel(invite.status)}
          tone={toInviteStatusTone(invite.status)}
          uppercase={false}
        />
      </View>

      <Typography color="rgba(177, 209, 226, 0.9)" numberOfLines={2} variant="Caption">
        {invite.circleDescription?.trim() || 'No circle description yet.'}
      </Typography>

      <View style={styles.metaRow}>
        <StatusChip label={toRoleLabel(invite.roleToGrant)} tone="neutral" uppercase={false} />
        <Typography color="rgba(164, 197, 216, 0.88)" variant="Caption">
          {formatInviteExpiry(invite.expiresAt)}
        </Typography>
      </View>

      <Button onPress={() => onReview(invite)} title="Review invite" variant="secondary" />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerTextWrap: {
    flex: 1,
    gap: 1,
  },
  iconWrap: {
    alignItems: 'center',
    borderColor: 'rgba(123, 171, 197, 0.6)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});

export type { CirclePendingInviteCardProps };
