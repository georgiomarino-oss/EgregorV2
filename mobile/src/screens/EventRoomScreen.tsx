import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchEventRoomSnapshot,
  joinEventRoom,
  leaveEventRoom,
  refreshEventPresence,
  type EventRoomSnapshot,
} from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { homeCardGap, sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type EventRoomRoute = RouteProp<EventsStackParamList, 'EventRoom'>;

function formatEventStatus(status: EventRoomSnapshot['event']['status']) {
  if (status === 'live') {
    return 'Live';
  }
  if (status === 'scheduled') {
    return 'Scheduled';
  }
  if (status === 'completed') {
    return 'Completed';
  }
  return 'Cancelled';
}

export function EventRoomScreen() {
  const route = useRoute<EventRoomRoute>();
  const eventId = route.params?.eventId;

  const [userId, setUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EventRoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!eventId) {
      setError('Missing event identifier.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        throw new Error(userError?.message || 'You must be signed in to join event rooms.');
      }

      setUserId(data.user.id);
      const nextSnapshot = await fetchEventRoomSnapshot(eventId, data.user.id);
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load room state.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const refreshSnapshot = useCallback(async () => {
    if (!eventId || !userId) {
      return;
    }

    setRefreshing(true);
    try {
      const nextSnapshot = await fetchEventRoomSnapshot(eventId, userId);
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to refresh room.');
    } finally {
      setRefreshing(false);
    }
  }, [eventId, userId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!eventId || !userId) {
      return;
    }

    let channel: RealtimeChannel | null = supabase.channel(`event-room-${eventId}`);
    channel = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `event_id=eq.${eventId}`,
          schema: 'public',
          table: 'event_participants',
        },
        () => {
          void refreshSnapshot();
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [eventId, refreshSnapshot, userId]);

  useEffect(() => {
    if (!eventId || !userId || !snapshot?.isJoined) {
      return;
    }

    const interval = setInterval(() => {
      void refreshEventPresence(eventId, userId).catch(() => null);
    }, 45000);

    return () => {
      clearInterval(interval);
    };
  }, [eventId, snapshot?.isJoined, userId]);

  const energyPercent = useMemo(() => {
    const joinedCount = snapshot?.joinedCount ?? 0;
    const normalized = Math.min(100, Math.round((joinedCount / 500) * 100));
    return Math.max(8, normalized);
  }, [snapshot?.joinedCount]);

  const onToggleJoin = async () => {
    if (!eventId || !userId) {
      return;
    }

    setJoining(true);
    try {
      if (snapshot?.isJoined) {
        await leaveEventRoom(eventId, userId);
      } else {
        await joinEventRoom(eventId, userId);
      }

      await refreshSnapshot();
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update room presence.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="eventRoom"
    >
      {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}

      {snapshot ? (
        <>
          <Typography variant="H1" weight="bold">
            {snapshot.event.title}
          </Typography>
          <Typography color={colors.textSecondary}>
            {snapshot.event.description?.trim() ||
              'Hold your intention here and contribute to the collective field.'}
          </Typography>

          <SurfaceCard radius="xl" style={styles.section} variant="eventRoomCurrent">
            <Typography color={colors.textLabel} variant="Label">
              Current room
            </Typography>
            <Typography variant="H2" weight="bold">
              {route.params?.eventTitle ?? snapshot.event.title}
            </Typography>
            <Typography color={figmaV2Reference.text.bodyStrong}>
              {`${formatEventStatus(snapshot.event.status)} • ${snapshot.joinedCount} joined`}
            </Typography>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[
                  figmaV2Reference.eventRoom.progressFillFrom,
                  figmaV2Reference.eventRoom.progressFillTo,
                ]}
                end={{ x: 1, y: 0 }}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                style={[styles.progressFill, { width: `${energyPercent}%` }]}
              />
            </View>

            <View style={styles.joinRow}>
              <Typography variant="H2" weight="bold">
                {snapshot.isJoined ? 'You are in this room' : 'Join this room now'}
              </Typography>
              <Button
                loading={joining}
                onPress={() => void onToggleJoin()}
                title={snapshot.isJoined ? 'Leave room' : 'Join room'}
                variant={snapshot.isJoined ? 'secondary' : 'gold'}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
            <Typography variant="H2" weight="bold">
              Host note
            </Typography>
            <Typography color={colors.textCaption} variant="Caption">
              {snapshot.event.hostNote?.trim() || 'Host note will appear when published.'}
            </Typography>
            <Button
              loading={refreshing}
              onPress={() => void refreshSnapshot()}
              title="Refresh room"
              variant="secondary"
            />
          </SurfaceCard>
        </>
      ) : null}

      {!loading && !snapshot ? (
        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            Room unavailable
          </Typography>
          <Typography color={colors.textSecondary}>
            We could not find this room. Return to Events and pick another event.
          </Typography>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography color={colors.danger}>{error}</Typography>
        </SurfaceCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  joinRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  progressFill: {
    borderRadius: radii.pill,
    flex: 1,
  },
  progressTrack: {
    borderColor: figmaV2Reference.eventRoom.progressTrackBorder,
    borderRadius: radii.pill,
    borderWidth: 0.8,
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    padding: 1,
  },
  section: {
    gap: homeCardGap,
  },
});
