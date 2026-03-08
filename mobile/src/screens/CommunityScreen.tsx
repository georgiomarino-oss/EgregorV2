import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyStateCard } from '../components/EmptyStateCard';
import { Button } from '../components/Button';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import type { CommunityStackParamList } from '../app/navigation/types';
import { CirclePendingInviteCard } from '../features/circles/components/CirclePendingInviteCard';
import { CircleSummaryCard } from '../features/circles/components/CircleSummaryCard';
import { CirclesHeroPanel } from '../features/circles/components/CirclesHeroPanel';
import { useCirclesDashboard } from '../features/circles/hooks/useCirclesDashboard';
import { sectionGap } from '../theme/layout';
import { colors, sectionVisualThemes, spacing } from '../theme/tokens';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;
type CircleSegment = 'invites' | 'my' | 'shared';

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNavigation>();
  const [segment, setSegment] = useState<CircleSegment>('my');
  const { error, loading, myCircles, pendingInvites, refreshing, reload, sharedCircles } =
    useCirclesDashboard();

  const segmentItems =
    segment === 'my' ? myCircles : segment === 'shared' ? sharedCircles : pendingInvites;

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="circles"
    >
      <CirclesHeroPanel
        myCount={myCircles.length}
        pendingCount={pendingInvites.length}
        sharedCount={sharedCircles.length}
      />

      <SegmentedTabs
        activeKey={segment}
        onChange={(nextKey) => {
          if (nextKey === 'shared' || nextKey === 'invites') {
            setSegment(nextKey);
            return;
          }

          setSegment('my');
        }}
        options={[
          { key: 'my', label: `My Circles (${myCircles.length})` },
          { key: 'shared', label: `Shared With Me (${sharedCircles.length})` },
          { key: 'invites', label: `Pending Invites (${pendingInvites.length})` },
        ]}
        section="circles"
      />

      {loading ? (
        <LoadingStateCard
          subtitle="Fetching your circle memberships and invitations."
          title="Loading circles"
        />
      ) : null}

      {!loading && segment === 'my'
        ? myCircles.map((circle) => (
            <CircleSummaryCard
              circle={circle}
              key={circle.circleId}
              onPress={(selectedCircle) => {
                navigation.navigate('CircleDetails', {
                  circleId: selectedCircle.circleId,
                  circleName: selectedCircle.name,
                });
              }}
            />
          ))
        : null}

      {!loading && segment === 'shared'
        ? sharedCircles.map((circle) => (
            <CircleSummaryCard
              circle={circle}
              key={circle.circleId}
              onPress={(selectedCircle) => {
                navigation.navigate('CircleDetails', {
                  circleId: selectedCircle.circleId,
                  circleName: selectedCircle.name,
                });
              }}
            />
          ))
        : null}

      {!loading && segment === 'invites'
        ? pendingInvites.map((invite) => (
            <CirclePendingInviteCard
              invite={invite}
              key={invite.invitationId}
              onReview={(selectedInvite) => {
                navigation.navigate('InviteDecision', {
                  invitationId: selectedInvite.invitationId,
                  inviteToken: selectedInvite.inviteToken,
                });
              }}
            />
          ))
        : null}

      {!loading && segmentItems.length === 0 ? (
        <EmptyStateCard
          action={undefined}
          backgroundColor={sectionVisualThemes.circles.surface.card[0]}
          body={
            segment === 'my'
              ? 'Create or accept invites to start building your circles.'
              : segment === 'shared'
                ? 'Circles shared with you will appear here after invite acceptance.'
                : 'Pending invitations will appear here when someone invites you.'
          }
          bodyColor={colors.textCaption}
          borderColor={sectionVisualThemes.circles.surface.edge}
          iconBackgroundColor={sectionVisualThemes.circles.surface.card[0]}
          iconBorderColor={sectionVisualThemes.circles.surface.edge}
          iconName={segment === 'invites' ? 'email-outline' : 'account-group-outline'}
          iconTint={sectionVisualThemes.circles.media.icon}
          title={
            segment === 'my'
              ? 'No circles yet'
              : segment === 'shared'
                ? 'No shared circles yet'
                : 'No pending invites'
          }
          titleColor={colors.textPrimary}
        />
      ) : null}

      {error ? (
        <RetryPanel
          loading={refreshing}
          message={error}
          onRetry={() => {
            void reload();
          }}
          retryLabel="Refresh"
          title="Could not load circles"
        />
      ) : (
        <View style={styles.refreshSpacer}>
          <Button
            loading={refreshing}
            onPress={() => {
              void reload();
            }}
            title="Refresh circles"
            variant="ghost"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
  refreshSpacer: {
    marginTop: spacing.xs,
  },
});
