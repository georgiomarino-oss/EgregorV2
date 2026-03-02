import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchEvents, type AppEvent } from '../lib/api/data';
import {
  EVENTS_PANEL_HEIGHT,
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { colors } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

function formatEventSubtitle(event: AppEvent) {
  if (event.status === 'live') {
    return `${event.participants} active now`;
  }

  const startsAt = new Date(event.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return event.subtitle?.trim() || 'Scheduled event';
  }

  const hoursUntil = Math.max(0, Math.floor((startsAt.getTime() - Date.now()) / 3600000));
  if (hoursUntil < 1) {
    return 'Starting soon';
  }

  if (hoursUntil < 24) {
    return `Starts in ${hoursUntil}h`;
  }

  const days = Math.floor(hoursUntil / 24);
  return `Starts in ${days}d`;
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await fetchEvents(8);
      setEvents(nextEvents);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const visibleEvents = useMemo(() => events.slice(0, 2), [events]);
  const primaryEventId = visibleEvents[0]?.id;

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Earth in prayer
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Join active circles and upcoming events from around the world.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={[styles.section, styles.mainPanel]} variant="eventsPanel">
        <View style={styles.globeWrap}>
          <LottieView autoPlay loop source={globeFallbackAnimation} style={styles.globeAnimation} />
        </View>

        {loading && events.length === 0 ? (
          <ActivityIndicator color={colors.accentMintStart} />
        ) : null}

        {error ? (
          <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              Could not load event stream
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              {error}
            </Typography>
          </SurfaceCard>
        ) : null}

        {!loading && visibleEvents.length === 0 ? (
          <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              No live or scheduled events yet
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              Create an event in Supabase to populate this feed.
            </Typography>
          </SurfaceCard>
        ) : (
          visibleEvents.map((event) => (
            <SurfaceCard key={event.id} radius="sm" style={styles.feedCard} variant="homeAlert">
              <Typography allowFontScaling={false} variant="H2" weight="bold">
                {event.title}
              </Typography>
              <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
                {formatEventSubtitle(event)}
              </Typography>
            </SurfaceCard>
          ))
        )}

        <Button
          disabled={!primaryEventId}
          onPress={() => {
            if (primaryEventId) {
              navigation.navigate('EventDetails', { eventId: primaryEventId });
              return;
            }
            navigation.navigate('EventDetails');
          }}
          title="Open map event timeline"
          variant="primary"
        />
        <Button
          loading={refreshing}
          onPress={() => void loadEvents(true)}
          title="Refresh events"
          variant="secondary"
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  globeAnimation: {
    height: 232,
    width: '100%',
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 232,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  mainPanel: {
    minHeight: EVENTS_PANEL_HEIGHT,
  },
  section: {
    gap: HOME_CARD_GAP,
  },
});
