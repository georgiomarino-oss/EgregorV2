import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { StatusChip } from '../components/StatusChip';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  acceptCircleInvite,
  declineCircleInvite,
  getCircleInvitePreviewByToken,
  listPendingCircleInvites,
  type CircleInvitePreview,
} from '../lib/api/circles';
import { sectionGap } from '../theme/layout';
import { colors, spacing } from '../theme/tokens';
import {
  formatInviteExpiry,
  toInviteStatusLabel,
  toInviteStatusTone,
  toRoleLabel,
  type InviteDisplayStatus,
} from '../features/circles/invitePresentation';

type Props = NativeStackScreenProps<CommunityStackParamList, 'InviteDecision'>;

function getStatusSummary(status: InviteDisplayStatus) {
  if (status === 'pending') {
    return 'Accepting adds you as an active circle member immediately.';
  }
  if (status === 'accepted') {
    return 'This invitation has already been accepted.';
  }
  if (status === 'declined') {
    return 'This invitation was declined.';
  }
  if (status === 'revoked') {
    return 'This invitation was revoked by the sender.';
  }
  if (status === 'expired') {
    return 'This invitation has expired.';
  }
  return 'This invite is invalid or unavailable for your account.';
}

export function InviteDecisionScreen({ navigation, route }: Props) {
  const routeToken = route.params?.inviteToken?.trim() || '';
  const routeInvitationId = route.params?.invitationId?.trim() || '';

  const [resolvedToken, setResolvedToken] = useState(routeToken);
  const [preview, setPreview] = useState<CircleInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const status: InviteDisplayStatus = useMemo(() => {
    if (!preview) {
      return 'invalid';
    }
    return preview.status;
  }, [preview]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      let token = routeToken;
      if (!token && routeInvitationId) {
        const pendingInvites = await listPendingCircleInvites();
        token =
          pendingInvites.find((invite) => invite.invitationId === routeInvitationId)?.inviteToken ??
          '';
      }

      setResolvedToken(token);
      if (!token) {
        setPreview(null);
        setError('No valid invite token was found for this link.');
        return;
      }

      const nextPreview = await getCircleInvitePreviewByToken(token);
      setPreview(nextPreview);
      setError(null);
    } catch (nextError) {
      setPreview(null);
      setError(nextError instanceof Error ? nextError.message : 'Failed to load invite details.');
    } finally {
      setLoading(false);
    }
  }, [routeInvitationId, routeToken]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const onAccept = async () => {
    if (!resolvedToken) {
      return;
    }

    setActing(true);
    try {
      await acceptCircleInvite({ inviteToken: resolvedToken });
      await loadPreview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to accept invite.');
      await loadPreview();
    } finally {
      setActing(false);
    }
  };

  const onDecline = async () => {
    if (!resolvedToken) {
      return;
    }

    setActing(true);
    try {
      await declineCircleInvite({ inviteToken: resolvedToken });
      await loadPreview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to decline invite.');
      await loadPreview();
    } finally {
      setActing(false);
    }
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <SurfaceCard radius="lg" variant="profileImpact">
        <Typography variant="H1" weight="bold">
          Invite decision
        </Typography>
        <Typography color={colors.textCaption} variant="Caption">
          Review circle context, inviter, role, and status before taking action.
        </Typography>
        <StatusChip
          label={toInviteStatusLabel(status)}
          tone={toInviteStatusTone(status)}
          uppercase={false}
        />
      </SurfaceCard>

      {loading ? (
        <LoadingStateCard
          subtitle="Resolving invite token and current state."
          title="Loading invite"
        />
      ) : null}

      {!loading && preview ? (
        <SurfaceCard radius="lg" variant="default">
          <Typography variant="H2" weight="bold">
            {preview.circleName}
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            {preview.circleDescription?.trim() || 'No circle description provided.'}
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            Invited by {preview.inviterDisplayName}
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            Role on accept: {toRoleLabel(preview.roleToGrant)}
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            {formatInviteExpiry(preview.expiresAt)}
          </Typography>
          <Typography variant="Caption">{getStatusSummary(status)}</Typography>

          {status === 'pending' ? (
            <View style={styles.actionRow}>
              <Button
                loading={acting}
                onPress={() => void onAccept()}
                title="Accept invite"
                variant="secondary"
              />
              <Button
                loading={acting}
                onPress={() => void onDecline()}
                title="Decline invite"
                variant="ghost"
              />
            </View>
          ) : null}

          {(status === 'accepted' || status === 'pending') && preview.circleId ? (
            <Button
              onPress={() => {
                navigation.navigate('CircleDetails', {
                  circleId: preview.circleId,
                  circleName: preview.circleName,
                });
              }}
              title="Open circle"
              variant="secondary"
            />
          ) : null}
        </SurfaceCard>
      ) : null}

      {!loading && !preview ? (
        <EmptyStateCard
          backgroundColor="rgba(10, 30, 45, 0.68)"
          body={getStatusSummary('invalid')}
          bodyColor={colors.textCaption}
          borderColor={colors.borderSoft}
          iconBackgroundColor="rgba(24, 50, 67, 0.9)"
          iconBorderColor="rgba(113, 165, 195, 0.55)"
          iconName="alert-circle-outline"
          iconTint="rgba(212, 242, 255, 0.9)"
          title="Invalid invite"
          titleColor={colors.textPrimary}
        />
      ) : null}

      {error ? (
        <RetryPanel
          loading={acting}
          message={error}
          onRetry={() => {
            void loadPreview();
          }}
          retryLabel="Retry"
          title="Invite state unavailable"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
});
