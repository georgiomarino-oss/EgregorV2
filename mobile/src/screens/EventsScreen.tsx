import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';

import Constants from 'expo-constants';
import * as Location from 'expo-location';

import { CosmicBackground } from '../components/CosmicBackground';
import { clientEnv } from '../lib/env';
import { DevClientMapboxPlaceholder } from './events/DevClientMapboxPlaceholder';
import { ExpoGoEventsFallback } from './events/ExpoGoEventsFallback';
import { sampleEvents, samplePresenceUsers } from './events/data';
import { loadMapboxModule } from './events/loadMapboxModule';

interface MinimalCoords {
  latitude: number;
  longitude: number;
}

export function EventsScreen() {
  const [coords, setCoords] = useState<MinimalCoords | null>(null);
  const [locationMessage, setLocationMessage] = useState('Requesting GPS permission...');

  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

  const mapboxModule = useMemo(() => (isExpoGo ? null : loadMapboxModule()), [isExpoGo]);
  const hasMapboxToken = Boolean(clientEnv.mapboxToken);

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
    <CosmicBackground ambientSource={ambientAnimation}>
      {isExpoGo ? (
        <ExpoGoEventsFallback
          events={sampleEvents}
          locationMessage={locationMessage}
          presenceUsers={samplePresenceUsers}
          userLocation={coords}
        />
      ) : (
        <DevClientMapboxPlaceholder
          events={sampleEvents}
          hasMapboxModule={Boolean(mapboxModule)}
          hasMapboxToken={hasMapboxToken}
          presenceUsers={samplePresenceUsers}
        />
      )}
    </CosmicBackground>
  );
}
