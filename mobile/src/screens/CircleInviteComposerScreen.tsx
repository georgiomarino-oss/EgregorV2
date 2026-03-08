import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { PremiumCircleCardSurface, PremiumHeroPanel } from '../components/CinematicPrimitives';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { ModalSheet } from '../components/ModalSheet';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { StatusChip } from '../components/StatusChip';
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
import { radii, sectionVisualThemes, spacing } from '../theme/tokens';
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
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="circles">
      <PremiumHeroPanel
        fallbackIcon="email-fast-outline"
        fallbackLabel="Invite flow"
        section="circles"
        style={styles.heroPanel}
      >
        <Typography variant="H1" weight="bold">
          Invite to {circleName}
        </Typography>
        <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
          Send in-app or external invites with clear role and pending state tracking.
        </Typography>
      </PremiumHeroPanel>

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
        section="circles"
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
        section="circles"
      />

      {mode === 'existing' ? (
        <PremiumCircleCardSurface
          fallbackIcon="account-search"
          fallbackLabel="Find people"
          section="circles"
          style={styles.sectionPanel}
        >
          <TextField
            accessibilityLabel="Search users"
            autoCapitalize="none"
            autoCorrect={false}
            helperText={searching ? 'Searching...' : 'Type a display name'}
            label="Find users"
            onChangeText={setSearchQuery}
            placeholder="Search by display name"
            section="circles"
            value={searchQuery}
          />

          {searching ? (
            <LoadingStateCard compact subtitle="Searching eligible users." title="Searching" />
          ) : null}

          {!searching && searchResults.length === 0 ? (
            <EmptyStateCard
              backgroundColor={sectionVisualThemes.circles.surface.card[1]}
              body="No eligible users found for this query."
              bodyColor={sectionVisualThemes.circles.nav.labelIdle}
              borderColor={sectionVisualThemes.circles.surface.border}
              iconBackgroundColor={sectionVisualThemes.circles.surface.card[0]}
              iconBorderColor={sectionVisualThemes.circles.media.frameBorder}
              iconName="account-search"
              iconTint={sectionVisualThemes.circles.media.icon}
              title="No users found"
              titleColor={sectionVisualThemes.circles.nav.labelActive}
            />
          ) : null}

          {searchResults.map((user) => (
            <View key={user.userId} style={styles.resultRow}>
              <View style={styles.resultBody}>
                <Typography numberOfLines={1} variant="Body" weight="bold">
                  {user.displayName}
                </Typography>
                <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
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
        </PremiumCircleCardSurface>
      ) : (
        <PremiumCircleCardSurface
          fallbackIcon="link-variant"
          fallbackLabel="Shareable invite"
          section="circles"
          style={styles.sectionPanel}
        >
          <TextField
            accessibilityLabel="Invite contact"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Email or phone"
            label="External contact"
            onChangeText={setExternalContact}
            placeholder="example@email.com"
            section="circles"
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
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
            Link invites stay pending until accepted from the invite decision flow.
          </Typography>
        </PremiumCircleCardSurface>
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
        <PremiumCircleCardSurface
          fallbackIcon="check-circle-outline"
          fallbackLabel="Invite status"
          section="circles"
          style={styles.noticeCard}
        >
          <Typography color={sectionVisualThemes.circles.nav.labelActive} variant="Caption">
            {successMessage}
          </Typography>
        </PremiumCircleCardSurface>
      ) : null}

      {latestInvite ? (
        <ModalSheet onBackdropPress={closeInviteSheet}>
          <Typography variant="Body" weight="bold">
            Invite ready
          </Typography>
          <Typography color={sectionVisualThemes.circles.nav.labelIdle} variant="Caption">
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
  heroPanel: {
    gap: spacing.sm,
  },
  linkBox: {
    backgroundColor: sectionVisualThemes.circles.surface.card[1],
    borderColor: sectionVisualThemes.circles.surface.edge,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  noticeCard: {
    minHeight: 52,
  },
  resultBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: sectionVisualThemes.circles.surface.card[1],
    borderColor: sectionVisualThemes.circles.surface.edge,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sectionPanel: {
    gap: spacing.sm,
  },
});