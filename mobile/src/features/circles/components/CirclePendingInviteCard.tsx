import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../../components/Button';
import { PremiumCircleCardSurface } from '../../../components/CinematicPrimitives';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import type { CircleInviteSummary } from '../../../lib/api/circles';
import { radii, sectionVisualThemes, spacing } from '../../../theme/tokens';
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
    <PremiumCircleCardSurface
      fallbackIcon="email-outline"
      fallbackLabel="Invitation waiting"
      section="circles"
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={sectionVisualThemes.circles.media.icon} name="mail" size={16} />
        </View>
        <View style={styles.headerTextWrap}>
          <Typography numberOfLines={1} variant="Body" weight="bold">
            {invite.circleName}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} numberOfLines={2} variant="Caption">
            Invited by {invite.inviterDisplayName}.
          </Typography>
        </View>
        <StatusChip
          label={toInviteStatusLabel(invite.status)}
          tone={toInviteStatusTone(invite.status)}
          uppercase={false}
        />
      </View>

      <Typography color={sectionVisualThemes.circles.nav.labelIdle} numberOfLines={2} variant="Caption">
        {invite.circleDescription?.trim() || 'No circle description yet.'}
      </Typography>

      <View style={styles.metaRow}>
        <StatusChip label={toRoleLabel(invite.roleToGrant)} tone="neutral" uppercase={false} />
        <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
          {formatInviteExpiry(invite.expiresAt)}
        </Typography>
      </View>

      <Button onPress={() => onReview(invite)} title="Review invite" variant="secondary" />
    </PremiumCircleCardSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
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
    borderColor: sectionVisualThemes.circles.surface.edge,
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
