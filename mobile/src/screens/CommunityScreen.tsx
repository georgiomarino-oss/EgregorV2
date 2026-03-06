import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { CircleEntryCards } from '../features/community/components/CircleEntryCards';
import { CommunityAlertFeed } from '../features/community/components/CommunityAlertFeed';
import { GlobalPulseHero } from '../features/community/components/GlobalPulseHero';
import { LiveMetricsPanel } from '../features/community/components/LiveMetricsPanel';
import {
  fetchCommunitySnapshot,
  getCachedCommunitySnapshot,
  type CommunitySnapshot,
} from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNavigation>();
  const initialSnapshot = getCachedCommunitySnapshot();
  const hadInitialSnapshotRef = useRef(Boolean(initialSnapshot));
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!hadInitialSnapshotRef.current) {
      setLoading(true);
    }

    try {
      const nextSnapshot = await fetchCommunitySnapshot();
      setSnapshot(nextSnapshot);
      hadInitialSnapshotRef.current = true;
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to load community activity.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadSnapshot();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadSnapshot]);

  useEffect(() => {
    const channel = supabase
      .channel('community-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void loadSnapshot();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        void loadSnapshot();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_user_presence' }, () => {
        void loadSnapshot();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSnapshot]);

  const openEventDetails = (eventId: string) => {
    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (!parent) {
      return;
    }

    parent.navigate('EventsTab', { params: { eventId }, screen: 'EventDetails' });
  };

  const onPrimaryAction = () => {
    if (snapshot?.strongestLiveEventId) {
      openEventDetails(snapshot.strongestLiveEventId);
      return;
    }

    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (parent) {
      parent.navigate('EventsTab');
      return;
    }

    void loadSnapshot();
  };

  const prayerCircleCount = snapshot?.liveEvents ?? 0;
  const eventsCircleCount = snapshot?.events.length ?? 0;
  const alerts = snapshot?.alerts ?? [];
  const emptyState = !loading && alerts.length === 0;

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <GlobalPulseHero
        liveEvents={snapshot?.liveEvents ?? 0}
        strongestLiveEventTitle={snapshot?.strongestLiveEventTitle ?? null}
      />

      <LiveMetricsPanel
        countries={snapshot?.countries ?? 0}
        liveEvents={snapshot?.liveEvents ?? 0}
        loading={loading && !snapshot}
        onPrimaryAction={onPrimaryAction}
        primaryActionTitle={
          snapshot?.strongestLiveEventTitle ? 'Join strongest live room' : 'Explore events'
        }
        uniqueActiveParticipants={snapshot?.uniqueActiveParticipants ?? 0}
      />

      {emptyState ? (
        <>
          <CircleEntryCards
            eventsCircleCount={eventsCircleCount}
            onOpenEventsCircle={() => navigation.navigate('EventsCircle')}
            onOpenPrayerCircle={() => navigation.navigate('PrayerCircle')}
            prayerCircleCount={prayerCircleCount}
          />
          <CommunityAlertFeed
            alerts={alerts}
            emptyState
            errorMessage={error}
            onOpenEventDetails={openEventDetails}
            onRetry={() => {
              void loadSnapshot();
            }}
          />
        </>
      ) : (
        <CommunityAlertFeed
          alerts={alerts}
          emptyState={false}
          errorMessage={error}
          onOpenEventDetails={openEventDetails}
          onRetry={() => {
            void loadSnapshot();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
});
