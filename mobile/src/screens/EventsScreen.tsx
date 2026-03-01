import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { clientEnv } from '../lib/env';
import { colors, eventMarkerColors, spacing } from '../theme/tokens';
import { loadMapboxModule } from './events/loadMapboxModule';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

interface EventItem {
  id: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  status: 'live' | 'scheduled';
  title: string;
}

interface PresenceUser {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

const sampleEvents: EventItem[] = [
  {
    id: 'event-1',
    latitude: 40.4168,
    longitude: -3.7038,
    startsAt: 'Live now',
    status: 'live',
    title: 'Madrid - Emergency response room',
  },
  {
    id: 'event-2',
    latitude: 28.6139,
    longitude: 77.209,
    startsAt: 'Live in 11 min',
    status: 'scheduled',
    title: 'Delhi - Night calm wave',
  },
];

const samplePresenceUsers: PresenceUser[] = [
  { id: 'user-1', latitude: 52.52, longitude: 13.405, name: 'Mina' },
  { id: 'user-2', latitude: -23.5505, longitude: -46.6333, name: 'Ravi' },
  { id: 'user-3', latitude: 37.7749, longitude: -122.4194, name: 'Elena' },
];

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Requesting GPS permission...');

  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

  const mapboxModule = useMemo(() => (isExpoGo ? null : loadMapboxModule()), [isExpoGo]);
  const hasMapboxToken = Boolean(clientEnv.mapboxToken);
  const primaryEventId = sampleEvents[0]?.id;

  useEffect(() => {
    if (!mapboxModule || !clientEnv.mapboxToken) {
      return;
    }

    mapboxModule.setAccessToken?.(clientEnv.mapboxToken);
  }, [mapboxModule]);

  useEffect(() => {
    let active = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active) {
        return;
      }

      if (permission.status !== 'granted') {
        setLocationMessage(
          'Location denied. Showing fallback event stream without your live position.',
        );
        return;
      }

      setLocationMessage('Location active. Presence updates are running.');

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!active) {
        return;
      }

      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 15000,
        },
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
      );
    };

    void startLocation();

    return () => {
      active = false;
      locationSubscription?.remove();
    };
  }, []);

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="events">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Earth in prayer
        </Typography>
        <Typography color={eventMarkerColors.user}>{locationMessage}</Typography>
        <Typography color={eventMarkerColors.user} variant="Caption">
          {coords
            ? `You: ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`
            : 'Your location is not available yet.'}
        </Typography>

        <SurfaceCard radius="xl" style={styles.section} variant="eventRoomCurrent">
          <Typography color={eventMarkerColors.live} variant="Label">
            Live Globe
          </Typography>

          {isExpoGo ? (
            <View style={styles.globeWrap}>
              <LottieView
                autoPlay
                loop
                source={globeFallbackAnimation}
                style={styles.globeAnimation}
              />
            </View>
          ) : (
            <SurfaceCard radius="md" style={styles.devCard}>
              <Typography variant="Body">Dev build map hook ready.</Typography>
              <Typography color={hasMapboxToken ? eventMarkerColors.user : eventMarkerColors.live}>
                {`Mapbox token: ${hasMapboxToken ? 'configured' : 'missing'}`}
              </Typography>
              <Typography color={mapboxModule ? eventMarkerColors.user : eventMarkerColors.live}>
                {`Mapbox module: ${mapboxModule ? 'loaded' : 'not loaded'}`}
              </Typography>
            </SurfaceCard>
          )}

          {sampleEvents.map((event) => (
            <SurfaceCard key={event.id} radius="sm" style={styles.feedCard} variant="homeAlert">
              <View style={styles.eventRow}>
                <View style={styles.rowLead}>
                  <Dot
                    color={
                      event.status === 'live' ? eventMarkerColors.live : eventMarkerColors.scheduled
                    }
                  />
                  <Typography variant="H2" weight="bold">
                    {event.title}
                  </Typography>
                </View>
                <Typography color={colors.textSecondary} variant="Caption">
                  {event.startsAt}
                </Typography>
              </View>
            </SurfaceCard>
          ))}

          <View style={styles.row}>
            <Dot color={eventMarkerColors.live} />
            <Typography variant="Caption">Live events</Typography>
            <Dot color={eventMarkerColors.scheduled} />
            <Typography variant="Caption">Scheduled</Typography>
            <Dot color={eventMarkerColors.user} />
            <Typography variant="Caption">Users</Typography>
          </View>

          <Button
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

          {samplePresenceUsers.map((user) => (
            <Typography color={eventMarkerColors.user} key={user.id} variant="Caption">
              {`USER • ${user.name} (${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)})`}
            </Typography>
          ))}
        </SurfaceCard>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  devCard: {
    gap: spacing.xs,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  eventRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  feedCard: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rowLead: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
});
