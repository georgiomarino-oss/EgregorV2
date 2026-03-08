import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { listMyCircles, type CanonicalCircleSummary } from '../lib/api/circles';
import { sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'EventsCircle'>;

function findEventsCircle(circles: CanonicalCircleSummary[]) {
  return (
    circles.find((circle) => circle.name.trim().toLowerCase() === 'events circle') ??
    circles.find((circle) => circle.name.trim().toLowerCase().includes('events')) ??
    null
  );
}

export function EventsCircleScreen() {
  const navigation = useNavigation<CommunityNavigation>();
  const [circle, setCircle] = useState<CanonicalCircleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const circles = await listMyCircles();
      setCircle(findEventsCircle(circles));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to locate events circle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <SurfaceCard radius="lg" variant="profileImpact">
        <Typography variant="H1" weight="bold">
          Events Circle moved
        </Typography>
        <Typography color={colors.textCaption} variant="Caption">
          This legacy route is retained for compatibility. Use Circles for canonical membership and
          invite flows.
        </Typography>
      </SurfaceCard>

      {loading ? (
        <LoadingStateCard subtitle="Resolving your Events Circle." title="Loading" />
      ) : null}

      {!loading && circle ? (
        <SurfaceCard radius="lg" variant="default">
          <Typography variant="Body" weight="bold">
            Found: {circle.name}
          </Typography>
          <Typography color={colors.textCaption} variant="Caption">
            Open this circle in the canonical Circles experience.
          </Typography>
          <Button
            onPress={() => {
              navigation.navigate('CircleDetails', {
                circleId: circle.circleId,
                circleName: circle.name,
              });
            }}
            title="Open Events Circle"
            variant="secondary"
          />
        </SurfaceCard>
      ) : null}

      {!loading && !circle ? (
        <EmptyStateCard
          backgroundColor="rgba(10, 30, 45, 0.68)"
          body="Use Circles to access your memberships and pending invites."
          bodyColor={colors.textCaption}
          borderColor={colors.borderSoft}
          iconBackgroundColor="rgba(24, 50, 67, 0.9)"
          iconBorderColor="rgba(113, 165, 195, 0.55)"
          iconName="earth"
          iconTint="rgba(212, 242, 255, 0.9)"
          title="No Events Circle found"
          titleColor={colors.textPrimary}
        />
      ) : null}

      <Button
        onPress={() => {
          navigation.navigate('CommunityHome');
        }}
        title="Open Circles"
        variant="secondary"
      />

      {error ? (
        <RetryPanel
          message={error}
          onRetry={() => {
            void load();
          }}
          retryLabel="Retry"
          title="Could not resolve events circle"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
});
