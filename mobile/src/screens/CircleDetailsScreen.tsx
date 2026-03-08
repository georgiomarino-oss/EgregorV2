import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { ModalSheet } from '../components/ModalSheet';
import { PremiumCircleCardSurface, PremiumHeroPanel } from '../components/CinematicPrimitives';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StatusChip } from '../components/StatusChip';
import { Typography } from '../components/Typography';
import { CircleDetailMemberRow } from '../features/circles/components/CircleDetailMemberRow';
import { CircleInviteRecordRow } from '../features/circles/components/CircleInviteRecordRow';
import { toRoleLabel } from '../features/circles/invitePresentation';
import {
  listCircleInvitesForManager,
  listCircleMembers,
  listMyCircles,
  removeCircleMember,
  revokeCircleInvite,
  updateCircleMemberRole,
  type CanonicalCircleSummary,
  type CircleInviteRecord,
  type CircleMemberRecord,
  type CircleMembershipRole,
} from '../lib/api/circles';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';
import { sectionVisualThemes, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CircleDetails'>;

function canManageCircle(role: CircleMembershipRole | null | undefined) {
  return role === 'owner' || role === 'steward';
}

export function CircleDetailsScreen({ navigation, route }: Props) {
  const circleId = route.params?.circleId?.trim() || '';
  const fallbackCircleName = route.params?.circleName?.trim() || 'Circle';

  const [circle, setCircle] = useState<CanonicalCircleSummary | null>(null);
  const [members, setMembers] = useState<CircleMemberRecord[]>([]);
  const [inviteRecords, setInviteRecords] = useState<CircleInviteRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CircleMemberRecord | null>(null);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  const actorRole = circle?.membershipRole ?? null;
  const canManageMembers = canManageCircle(actorRole);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        if (!circleId) {
          throw new Error('Circle is required to view details.');
        }

        const [circles, circleMembers] = await Promise.all([
          listMyCircles(),
          listCircleMembers(circleId),
        ]);
        const selectedCircle = circles.find((entry) => entry.circleId === circleId) ?? null;

        let invites: CircleInviteRecord[] = [];
        if (canManageCircle(selectedCircle?.membershipRole)) {
          invites = await listCircleInvitesForManager({
            circleId,
            limit: 60,
          });
        }

        setCircle(selectedCircle);
        setMembers(circleMembers);
        setInviteRecords(invites);
        setError(null);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Failed to load circle details.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [circleId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) {
        return;
      }
      setCurrentUserId(data.user?.id ?? '');
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  const sortedMembers = useMemo(() => {
    return members.slice().sort((left, right) => {
      if (left.role === right.role) {
        return left.displayName.localeCompare(right.displayName);
      }

      if (left.role === 'owner') {
        return -1;
      }
      if (right.role === 'owner') {
        return 1;
      }
      if (left.role === 'steward') {
        return -1;
      }
      if (right.role === 'steward') {
        return 1;
      }

      return left.displayName.localeCompare(right.displayName);
    });
  }, [members]);

  const applyRole = async (role: CircleMembershipRole) => {
    if (!selectedMember) {
      return;
    }

    setMemberActionLoading(true);
    try {
      await updateCircleMemberRole({
        circleId,
        role,
        targetUserId: selectedMember.userId,
      });
      setSelectedMember(null);
      setToast(`Updated ${selectedMember.displayName} to ${role}.`);
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update member role.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  const removeMember = async () => {
    if (!selectedMember) {
      return;
    }

    setMemberActionLoading(true);
    try {
      await removeCircleMember({
        circleId,
        targetUserId: selectedMember.userId,
      });
      setSelectedMember(null);
      setToast(`${selectedMember.displayName} was removed.`);
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to remove member.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  const onRevokeInvite = async (invite: CircleInviteRecord) => {
    setRevokingInviteId(invite.invitationId);
    try {
      await revokeCircleInvite({ invitationId: invite.invitationId });
      setToast('Invitation revoked.');
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to revoke invitation.');
    } finally {
      setRevokingInviteId(null);
    }
  };

  const circleName = circle?.name ?? fallbackCircleName;

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="circles">
      <PremiumHeroPanel
        fallbackIcon="account-group-outline"
        fallbackLabel="Circle governance"
        section="circles"
        style={styles.heroPanel}
      >
        <View style={styles.headerTopRow}>
          <Button onPress={() => navigation.navigate('CommunityHome')} title="Back" variant="ghost" />
          {canManageMembers ? (
            <Button
              onPress={() => {
                navigation.navigate('CircleInviteComposer', {
                  circleId,
                  circleName,
                });
              }}
              title="Invite"
              variant="secondary"
            />
          ) : null}
        </View>

        <SectionHeader
          subtitle={
            circle?.description?.trim() ||
            'Members, invite states, and permissions for this circle.'
          }
          subtitleColor={sectionVisualThemes.circles.nav.labelIdle}
          title={circleName}
          titleColor={sectionVisualThemes.circles.nav.labelActive}
        />

        <View style={styles.heroMetaRow}>
          <StatusChip label={`Members ${members.length}`} tone="upcoming" uppercase={false} />
          <StatusChip
            label={`Role ${toRoleLabel(actorRole ?? 'member')}`}
            tone={canManageMembers ? 'success' : 'neutral'}
            uppercase={false}
          />
        </View>
      </PremiumHeroPanel>

      {loading ? (
        <LoadingStateCard subtitle="Syncing members and invite states." title="Loading circle" />
      ) : null}

      {!loading ? (
        <PremiumCircleCardSurface
          fallbackIcon="account-multiple-outline"
          fallbackLabel="Circle members"
          section="circles"
          style={styles.sectionPanel}
        >
          <SectionHeader
            subtitle="Active members only"
            subtitleColor={sectionVisualThemes.circles.nav.labelIdle}
            title="Members"
            titleColor={sectionVisualThemes.circles.nav.labelActive}
          />
          {sortedMembers.length === 0 ? (
            <EmptyStateCard
              backgroundColor={sectionVisualThemes.circles.surface.card[1]}
              body="No active members are visible for this circle."
              bodyColor={sectionVisualThemes.circles.nav.labelIdle}
              borderColor={sectionVisualThemes.circles.surface.border}
              iconBackgroundColor={sectionVisualThemes.circles.surface.card[0]}
              iconBorderColor={sectionVisualThemes.circles.media.frameBorder}
              iconName="account-outline"
              iconTint={sectionVisualThemes.circles.media.icon}
              title="No active members"
              titleColor={sectionVisualThemes.circles.nav.labelActive}
            />
          ) : (
            sortedMembers.map((member) => (
              <CircleDetailMemberRow
                isCurrentUser={member.userId === currentUserId}
                key={member.userId}
                member={member}
                onManage={setSelectedMember}
                showManage={canManageMembers}
              />
            ))
          )}
        </PremiumCircleCardSurface>
      ) : null}

      {!loading && canManageMembers ? (
        <PremiumCircleCardSurface
          fallbackIcon="email-outline"
          fallbackLabel="Invite tracking"
          section="circles"
          style={styles.sectionPanel}
        >
          <SectionHeader
            subtitle="Pending, accepted, declined, revoked, and expired"
            subtitleColor={sectionVisualThemes.circles.nav.labelIdle}
            title="Invites"
            titleColor={sectionVisualThemes.circles.nav.labelActive}
          />
          {inviteRecords.length === 0 ? (
            <EmptyStateCard
              backgroundColor={sectionVisualThemes.circles.surface.card[1]}
              body="No invites have been created for this circle yet."
              bodyColor={sectionVisualThemes.circles.nav.labelIdle}
              borderColor={sectionVisualThemes.circles.surface.border}
              iconBackgroundColor={sectionVisualThemes.circles.surface.card[0]}
              iconBorderColor={sectionVisualThemes.circles.media.frameBorder}
              iconName="email-outline"
              iconTint={sectionVisualThemes.circles.media.icon}
              title="No invites yet"
              titleColor={sectionVisualThemes.circles.nav.labelActive}
            />
          ) : (
            inviteRecords.map((invite) => (
              <CircleInviteRecordRow
                invite={invite}
                key={invite.invitationId}
                onRevoke={onRevokeInvite}
                revoking={revokingInviteId === invite.invitationId}
              />
            ))
          )}
        </PremiumCircleCardSurface>
      ) : null}

      {error ? (
        <RetryPanel
          loading={refreshing}
          message={error}
          onRetry={() => {
            void load(true);
          }}
          retryLabel="Retry"
          title="Circle details unavailable"
        />
      ) : null}

      {toast ? (
        <PremiumCircleCardSurface
          fallbackIcon="check-circle-outline"
          fallbackLabel="Update"
          section="circles"
          style={styles.toastCard}
        >
          <Typography color={sectionVisualThemes.circles.nav.labelActive} variant="Caption">
            {toast}
          </Typography>
        </PremiumCircleCardSurface>
      ) : null}

      {selectedMember ? (
        <ModalSheet
          onBackdropPress={() => {
            if (!memberActionLoading) {
              setSelectedMember(null);
            }
          }}
        >
          <Typography variant="Body" weight="bold">
            Manage {selectedMember.displayName}
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            Choose a role action or remove this member from the circle.
          </Typography>
          {actorRole === 'owner' && selectedMember.role !== 'steward' ? (
            <Button
              loading={memberActionLoading}
              onPress={() => {
                void applyRole('steward');
              }}
              title="Set as steward"
              variant="secondary"
            />
          ) : null}
          {selectedMember.role !== 'member' ? (
            <Button
              loading={memberActionLoading}
              onPress={() => {
                void applyRole('member');
              }}
              title="Set as member"
              variant="secondary"
            />
          ) : null}
          {actorRole === 'owner' ? (
            <Button
              loading={memberActionLoading}
              onPress={() => {
                void applyRole('owner');
              }}
              title="Grant owner"
              variant="secondary"
            />
          ) : null}
          <Button
            loading={memberActionLoading}
            onPress={() => {
              void removeMember();
            }}
            title="Remove member"
            variant="ghost"
          />
        </ModalSheet>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heroPanel: {
    gap: spacing.sm,
  },
  sectionPanel: {
    gap: spacing.xs,
  },
  toastCard: {
    minHeight: 52,
  },
});