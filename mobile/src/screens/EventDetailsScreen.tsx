import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchEventById,
  fetchEventLibraryItemById,
  fetchEvents,
  getCachedEventById,
  getCachedEventLibraryItemById,
  getCachedEvents,
  type AppEvent,
  type EventLibraryItem,
} from '../lib/api/data';
import { formatEventDateTimeInDeviceZone } from '../lib/dateTime';
import { supabase } from '../lib/supabase';
import { homeCardGap, profileRowGap, sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;
type EventDetailsRoute = RouteProp<EventsStackParamList, 'EventDetails'>;

function isEventLiveNow(event: Pick<AppEvent, 'durationMinutes' | 'startsAt'>) {
  const startsAtMillis = new Date(event.startsAt).getTime();
  if (!Number.isFinite(startsAtMillis)) {
    return false;
  }

  const endsAtMillis = startsAtMillis + Math.max(1, event.durationMinutes) * 60 * 1000;
  const nowMillis = Date.now();
  return nowMillis >= startsAtMillis && nowMillis < endsAtMillis;
}

function formatEventStartLabel(event: AppEvent) {
  if (isEventLiveNow(event)) {
    return 'Live now';
  }

  return (
    formatEventDateTimeInDeviceZone(event.startsAt, {
      includeDate: true,
      includeTimeZone: true,
    }) ?? 'Scheduled'
  );
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
  const initialEventTemplate = route.params?.eventTemplateId
    ? (getCachedEventLibraryItemById(route.params.eventTemplateId) ?? null)
    : null;
  const initialEvent = route.params?.eventId
    ? (getCachedEventById(route.params.eventId) ?? null)
    : ((getCachedEvents(1)?.[0] ?? null) as AppEvent | null);
  const hasInitialDetailsRef = useRef(Boolean(initialEventTemplate || initialEvent));
  const [event, setEvent] = useState<AppEvent | null>(initialEventTemplate ? null : initialEvent);
  const [eventTemplate, setEventTemplate] = useState<EventLibraryItem | null>(initialEventTemplate);
  const [loading, setLoading] = useState(!(initialEventTemplate || initialEvent));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!hasInitialDetailsRef.current) {
      setLoading(true);
    }

    try {
      const eventTemplateId = route.params?.eventTemplateId;
      if (eventTemplateId) {
        const selectedTemplate = await fetchEventLibraryItemById(eventTemplateId);
        setEventTemplate(selectedTemplate);
        setEvent(null);

        if (!selectedTemplate) {
          setError('Event template not found.');
        } else {
          hasInitialDetailsRef.current = true;
          setError(null);
        }

        return;
      }

      const eventId = route.params?.eventId;
      const selectedEvent = eventId ? await fetchEventById(eventId) : null;

      if (selectedEvent) {
        setEvent(selectedEvent);
        setEventTemplate(null);
        hasInitialDetailsRef.current = true;
        setError(null);
        return;
      }

      const fallbackEvents = await fetchEvents(1);
      setEvent(fallbackEvents[0] ?? null);
      setEventTemplate(null);
      hasInitialDetailsRef.current = true;
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [route.params?.eventId, route.params?.eventTemplateId]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      void loadEvent();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadEvent]);

  useEffect(() => {
    const channel = supabase
      .channel('event-details-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void loadEvent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        void loadEvent();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadEvent]);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}

      {eventTemplate ? (
        <>
          <Typography variant="H1" weight="bold">
            {eventTemplate.title}
          </Typography>
          <Typography color={colors.textSecondary}>{eventTemplate.body}</Typography>

          <SurfaceCard radius="xl" style={styles.section} variant="eventsPanel">
            <View style={styles.row}>
              <StatCard label="Category" value={eventTemplate.category ?? 'Manifestation'} />
              <StatCard label="Duration" value={`${eventTemplate.durationMinutes} min`} />
            </View>
            <StatCard label="Energy" value={`${eventTemplate.startsCount} starts`} />
            <Button
              loading={refreshing}
              onPress={() => void refreshEvent()}
              title="Refresh"
              variant="secondary"
            />
          </SurfaceCard>

          <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
            <Typography variant="H2" weight="bold">
              Manifestation script
            </Typography>
            <Typography color={colors.textSecondary}>{eventTemplate.script}</Typography>
          </SurfaceCard>
        </>
      ) : null}

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
              title={isEventLiveNow(event) ? 'Join live room' : 'Open room'}
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

      {!loading && !event && !eventTemplate ? (
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
