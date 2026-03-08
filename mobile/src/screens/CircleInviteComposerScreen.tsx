import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { ModalSheet } from '../components/ModalSheet';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { StatusChip } from '../components/StatusChip';
import { SurfaceCard } from '../components/SurfaceCard';
import { TextField } from '../components/TextField';
import { Typography } from '../components/Typography';
import {
  createCircleInvite,
  listMyCircles,
  searchInvitableUsers,
  type CircleInviteMutationResult,
  type CircleMembershipRole,
  type InvitableUser,
} from '../lib/api/circles';
import { buildCircleInviteUrl } from '../lib/invite';
import { sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';
import {
  toInviteStatusLabel,
  toInviteStatusTone,
  toRoleLabel,
} from '../features/circles/invitePresentation';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CircleInviteComposer'>;
type InviteMode = 'existing' | 'external';

function buildExternalInviteMessage(circleName: string, inviteUrl: string) {
  return `Join ${circleName} on Egregor.\n\nAccept your circle invite: ${inviteUrl}`;
}

export function CircleInviteComposerScreen({ route }: Props) {
  const circleId = route.params.circleId;
  const circleName = route.params.circleName?.trim() || 'Circle';

  const [mode, setMode] = useState<InviteMode>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InvitableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [externalContact, setExternalContact] = useState('');
  const [submittingExternal, setSubmittingExternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [latestInvite, setLatestInvite] = useState<CircleInviteMutationResult | null>(null);
  const [actorRole, setActorRole] = useState<CircleMembershipRole>('member');

  useEffect(() => {
    let active = true;
    void listMyCircles()
      .then((circles) => {
        if (!active) {
          return;
        }
        const current = circles.find((entry) => entry.circleId === circleId);
        if (current) {
          setActorRole(current.membershipRole);
        }
      })
      .catch(() => {
        // Non-blocking. Role enforcement remains backend-authoritative.
      });

    return () => {
      active = false;
    };
  }, [circleId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearching(true);
      void searchInvitableUsers({
        circleId,
        limit: 16,
        query: searchQuery,
      })
        .then((users) => {
          setSearchResults(users);
          setError(null);
        })
        .catch((nextError) => {
          setSearchResults([]);
          setError(nextError instanceof Error ? nextError.message : 'User search failed.');
        })
        .finally(() => {
          setSearching(false);
        });
    }, 240);

    return () => {
      clearTimeout(timer);
    };
  }, [circleId, searchQuery]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2800);

    return () => {
      clearTimeout(timer);
    };
  }, [successMessage]);

  const roleOptions = useMemo(() => {
    if (actorRole === 'owner') {
      return [
        { key: 'member', label: 'Member access' },
        { key: 'steward', label: 'Steward access' },
      ];
    }

    return [{ key: 'member', label: 'Member access' }];
  }, [actorRole]);

  const [roleToGrant, setRoleToGrant] = useState<CircleMembershipRole>('member');

  const inviteExistingUser = async (targetUserId: string) => {
    setSubmittingId(targetUserId);
    try {
      const invite = await createCircleInvite({
        circleId,
        roleToGrant,
        targetUserId,
      });
      setLatestInvite(invite);
      setSuccessMessage('Invite created and pending acceptance.');
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create invite.');
    } finally {
      setSubmittingId(null);
    }
  };

  const createExternalInvite = async () => {
    const contact = externalContact.trim();
    if (!contact) {
      setError('Enter an email or phone number to generate an invite link.');
      return;
    }

    setSubmittingExternal(true);
    try {
      const invite = await createCircleInvite({
        channel: 'link',
        circleId,
        roleToGrant,
        targetContact: contact,
      });
      setLatestInvite(invite);
      setSuccessMessage('Invite link created.');
      setError(null);
      setExternalContact('');
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to create external invite.',
      );
    } finally {
      setSubmittingExternal(false);
    }
  };

  const closeInviteSheet = () => {
    setLatestInvite(null);
  };

  const onCopyInviteLink = async () => {
    if (!latestInvite) {
      return;
    }

    const inviteUrl = buildCircleInviteUrl(latestInvite.inviteToken);
    await Clipboard.setStringAsync(inviteUrl);
    setSuccessMessage('Invite link copied.');
  };

  const onShareInvite = async () => {
    if (!latestInvite) {
      return;
    }

    const inviteUrl = buildCircleInviteUrl(latestInvite.inviteToken);
    await Share.share({
      message: buildExternalInviteMessage(circleName, inviteUrl),
      url: inviteUrl,
    });
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <SurfaceCard radius="lg" variant="profileImpact">
        <Typography variant="H1" weight="bold">
          Invite to {circleName}
        </Typography>
        <Typography color={colors.textCaption} variant="Caption">
          Send in-app or external invites with clear role and pending state tracking.
        </Typography>
      </SurfaceCard>

      <SegmentedTabs
        activeKey={mode}
        onChange={(nextKey) => {
          if (nextKey === 'external') {
            setMode('external');
            return;
          }
          setMode('existing');
        }}
        options={[
          { key: 'existing', label: 'Invite existing users' },
          { key: 'external', label: 'Invite by link' },
        ]}
      />

      <SegmentedTabs
        activeKey={roleToGrant}
        onChange={(nextKey) => {
          if (nextKey === 'steward' && actorRole === 'owner') {
            setRoleToGrant('steward');
            return;
          }
          setRoleToGrant('member');
        }}
        options={roleOptions}
      />

      {mode === 'existing' ? (
        <SurfaceCard radius="lg" variant="default">
          <TextField
            accessibilityLabel="Search users"
            autoCapitalize="none"
            autoCorrect={false}
            helperText={searching ? 'Searching...' : 'Type a display name'}
            label="Find users"
            onChangeText={setSearchQuery}
            placeholder="Search by display name"
            value={searchQuery}
          />

          {searching ? (
            <LoadingStateCard compact subtitle="Searching eligible users." title="Searching" />
          ) : null}

          {!searching && searchResults.length === 0 ? (
            <EmptyStateCard
              backgroundColor="rgba(10, 30, 45, 0.68)"
              body="No eligible users found for this query."
              bodyColor={colors.textCaption}
              borderColor={colors.borderSoft}
              iconBackgroundColor="rgba(24, 50, 67, 0.9)"
              iconBorderColor="rgba(113, 165, 195, 0.55)"
              iconName="account-search"
              iconTint="rgba(212, 242, 255, 0.9)"
              title="No users found"
              titleColor={colors.textPrimary}
            />
          ) : null}

          {searchResults.map((user) => (
            <View key={user.userId} style={styles.resultRow}>
              <View style={styles.resultBody}>
                <Typography numberOfLines={1} variant="Body" weight="bold">
                  {user.displayName}
                </Typography>
                <Typography color={colors.textCaption} variant="Caption">
                  Invite as {toRoleLabel(roleToGrant)}
                </Typography>
              </View>
              <Button
                loading={submittingId === user.userId}
                onPress={() => {
                  void inviteExistingUser(user.userId);
                }}
                title="Invite"
                variant="secondary"
              />
            </View>
          ))}
        </SurfaceCard>
      ) : (
        <SurfaceCard radius="lg" variant="default">
          <TextField
            accessibilityLabel="Invite contact"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Email or phone"
            label="External contact"
            onChangeText={setExternalContact}
            placeholder="example@email.com"
            value={externalContact}
          />
          <Button
            loading={submittingExternal}
            onPress={() => {
              void createExternalInvite();
            }}
            title="Create tracked invite link"
            variant="secondary"
          />
          <Typography color={colors.textCaption} variant="Caption">
            Link invites stay pending until accepted from the invite decision flow.
          </Typography>
        </SurfaceCard>
      )}

      {error ? (
        <RetryPanel
          message={error}
          onRetry={() => {
            setError(null);
          }}
          retryLabel="Dismiss"
          title="Invite action failed"
        />
      ) : null}

      {successMessage ? (
        <SurfaceCard radius="md" variant="homeAlert">
          <Typography variant="Caption">{successMessage}</Typography>
        </SurfaceCard>
      ) : null}

      {latestInvite ? (
        <ModalSheet onBackdropPress={closeInviteSheet}>
          <Typography variant="Body" weight="bold">
            Invite ready
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            Status: {toInviteStatusLabel(latestInvite.status)}. Role:{' '}
            {toRoleLabel(latestInvite.roleToGrant)}.
          </Typography>
          <View style={styles.linkBox}>
            <Typography numberOfLines={3} variant="Caption">
              {buildCircleInviteUrl(latestInvite.inviteToken)}
            </Typography>
          </View>
          <Button
            onPress={() => void onCopyInviteLink()}
            title="Copy invite link"
            variant="secondary"
          />
          <Button onPress={() => void onShareInvite()} title="Share invite" variant="secondary" />
          <StatusChip
            label={toInviteStatusLabel(latestInvite.status)}
            tone={toInviteStatusTone(latestInvite.status)}
            uppercase={false}
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
  linkBox: {
    backgroundColor: 'rgba(18, 42, 58, 0.84)',
    borderColor: 'rgba(112, 164, 196, 0.55)',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  resultBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 30, 45, 0.72)',
    borderColor: 'rgba(115, 165, 194, 0.5)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
