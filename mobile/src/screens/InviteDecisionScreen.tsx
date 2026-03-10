import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { PremiumCircleCardSurface, PremiumHeroPanel } from '../components/CinematicPrimitives';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { StatusChip } from '../components/StatusChip';
import { Typography } from '../components/Typography';
import {
  acceptCircleInvite,
  declineCircleInvite,
  getCircleInvitePreviewByToken,
  listPendingCircleInvites,
  type CircleInvitePreview,
} from '../lib/api/circles';
import { resolveCinematicArt } from '../lib/art/cinematicArt';
import { submitModerationReport } from '../lib/api/safety';
import { buildSupportRouteMetadata } from '../lib/support';
import { sectionGap } from '../theme/layout';
import { sectionVisualThemes, spacing } from '../theme/tokens';
import {
  formatInviteExpiry,
  toInviteStatusLabel,
  toInviteStatusTone,
  toRoleLabel,
  type InviteDisplayStatus,
} from '../features/circles/invitePresentation';
import { MOBILE_ANALYTICS_EVENTS, trackMobileEvent } from '../lib/observability';

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

  useEffect(() => {
    if (!preview) {
      return;
    }

    trackMobileEvent(MOBILE_ANALYTICS_EVENTS.CIRCLE_INVITE_VIEWED, {
      invitation_id: preview.invitationId,
      status: preview.status,
    });
  }, [preview?.invitationId, preview?.status]);

  const onAccept = async () => {
    if (!resolvedToken) {
      return;
    }

    setActing(true);
    try {
      await acceptCircleInvite({ inviteToken: resolvedToken });
      await loadPreview();
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.CIRCLE_INVITE_ACCEPTED, {
        invitation_id: preview?.invitationId ?? null,
      });
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
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.CIRCLE_INVITE_DECLINED, {
        invitation_id: preview?.invitationId ?? null,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to decline invite.');
      await loadPreview();
    } finally {
      setActing(false);
    }
  };

  const onReportInvite = async () => {
    if (!preview) {
      return;
    }

    setActing(true);
    try {
      const supportRouting = buildSupportRouteMetadata({
        source: 'moderation_report',
        surface: 'invite_decision',
      });
      await submitModerationReport({
        details: `Invite abuse report submitted for invite ${preview.invitationId}.`,
        reasonCode: 'spam',
        supportMetadata: supportRouting.supportMetadata,
        supportRoute: supportRouting.supportRoute,
        targetId: preview.invitationId,
        targetType: 'invite',
      });
      setError(null);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.TRUST_ACTION_REPORT, {
        source: 'invite_decision',
        target_type: 'invite',
      });
      Alert.alert('Report submitted', 'This invite report was added to moderation review.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to submit report.');
    } finally {
      setActing(false);
    }
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="circles">
      <PremiumHeroPanel
        artSource={resolveCinematicArt('circles.hero.inviteDecision')}
        fallbackIcon="email-seal-outline"
        fallbackLabel="Invite decision"
        section="circles"
        style={styles.heroPanel}
      >
        <Typography variant="H1" weight="bold">
          Invite decision
        </Typography>
        <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
          Review circle context, inviter, role, and status before taking action.
        </Typography>
        <StatusChip
          label={toInviteStatusLabel(status)}
          tone={toInviteStatusTone(status)}
          uppercase={false}
        />
      </PremiumHeroPanel>

      {loading ? (
        <LoadingStateCard
          subtitle="Resolving invite token and current state."
          title="Loading invite"
        />
      ) : null}

      {!loading && preview ? (
        <PremiumCircleCardSurface
          fallbackIcon="account-check-outline"
          fallbackLabel="Invite details"
          section="circles"
          style={styles.detailsCard}
        >
          <Typography variant="H2" weight="bold">
            {preview.circleName}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            {preview.circleDescription?.trim() || 'No circle description provided.'}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            Invited by {preview.inviterDisplayName}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            Role on accept: {toRoleLabel(preview.roleToGrant)}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            {formatInviteExpiry(preview.expiresAt)}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            {getStatusSummary(status)}
          </Typography>

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

          <Button
            loading={acting}
            onPress={() => {
              Alert.alert('Report invite', 'Submit this invite to moderation review?', [
                {
                  style: 'cancel',
                  text: 'Cancel',
                },
                {
                  text: 'Report',
                  onPress: () => {
                    void onReportInvite();
                  },
                },
              ]);
            }}
            title="Report invite"
            variant="ghost"
          />
        </PremiumCircleCardSurface>
      ) : null}

      {!loading && !preview ? (
        <EmptyStateCard
          backgroundColor={sectionVisualThemes.circles.surface.card[1]}
          body={getStatusSummary('invalid')}
          bodyColor={sectionVisualThemes.circles.nav.labelIdle}
          borderColor={sectionVisualThemes.circles.surface.border}
          iconBackgroundColor={sectionVisualThemes.circles.surface.card[0]}
          iconBorderColor={sectionVisualThemes.circles.media.frameBorder}
          iconName="alert-circle-outline"
          iconTint={sectionVisualThemes.circles.media.icon}
          title="Invalid invite"
          titleColor={sectionVisualThemes.circles.nav.labelActive}
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
  detailsCard: {
    gap: spacing.xs,
  },
  heroPanel: {
    gap: spacing.sm,
  },
});
