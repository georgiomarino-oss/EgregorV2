import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchEventById, fetchEvents, type AppEvent } from '../lib/api/data';
import { homeCardGap, profileRowGap, sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;
type EventDetailsRoute = RouteProp<EventsStackParamList, 'EventDetails'>;

function formatEventStartLabel(event: AppEvent) {
  if (event.status === 'live') {
    return 'Live now';
  }

  const startsAt = new Date(event.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return 'Scheduled';
  }

  return startsAt.toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard radius="sm" style={styles.statCard} variant="homeStatSmall">
      <Typography color={colors.textSecondary} variant="Label">
        {label}
      </Typography>
      <Typography variant="H2" weight="bold">
        {value}
      </Typography>
    </SurfaceCard>
  );
}

export function EventDetailsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const route = useRoute<EventDetailsRoute>();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    setLoading(true);

    try {
      const eventId = route.params?.eventId;
      const selectedEvent = eventId ? await fetchEventById(eventId) : null;

      if (selectedEvent) {
        setEvent(selectedEvent);
        setError(null);
        return;
      }

      const fallbackEvents = await fetchEvents(1);
      setEvent(fallbackEvents[0] ?? null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [route.params?.eventId]);

  const refreshEvent = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvent();
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}

      {event ? (
        <>
          <Typography variant="H1" weight="bold">
            {event.title}
          </Typography>
          <Typography color={colors.textSecondary}>
            {event.description?.trim() ||
              'Join this collective event and contribute your intention.'}
          </Typography>

          <SurfaceCard radius="xl" style={styles.section} variant="eventsPanel">
            <View style={styles.row}>
              <StatCard label="Starts" value={formatEventStartLabel(event)} />
              <StatCard label="Participants" value={event.participants.toString()} />
            </View>
            <View style={styles.row}>
              <StatCard label="Duration" value={`${event.durationMinutes} min`} />
              <StatCard
                label="Region"
                value={event.region?.trim() || event.countryCode?.trim() || 'Global'}
              />
            </View>

            <Button
              onPress={() =>
                navigation.navigate('EventRoom', {
                  eventId: event.id,
                  eventTitle: event.title,
                })
              }
              title={event.status === 'live' ? 'Join live room' : 'Open room'}
              variant="gold"
            />
            <Button
              loading={refreshing}
              onPress={() => void refreshEvent()}
              title="Refresh"
              variant="secondary"
            />
          </SurfaceCard>

          <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
            <Typography variant="H2" weight="bold">
              Host note
            </Typography>
            <Typography color={colors.textSecondary}>
              {event.hostNote?.trim() || 'Host note will appear here when available.'}
            </Typography>
          </SurfaceCard>

          <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
            <Typography variant="H2" weight="bold">
              Access
            </Typography>
            <Typography color={colors.textSecondary}>
              {event.visibility === 'public'
                ? 'Public room. Anyone can join with an account.'
                : 'Private room. Invite required.'}
            </Typography>
          </SurfaceCard>
        </>
      ) : null}

      {!loading && !event ? (
        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            No event selected
          </Typography>
          <Typography color={colors.textSecondary}>
            Create or schedule an event in Supabase, then return to this screen.
          </Typography>
          <Button
            loading={refreshing}
            onPress={() => void refreshEvent()}
            title="Try again"
            variant="secondary"
          />
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
  row: {
    flexDirection: 'row',
    gap: homeCardGap,
  },
  section: {
    gap: sectionGap,
  },
  statCard: {
    flex: 1,
    gap: profileRowGap,
  },
});
