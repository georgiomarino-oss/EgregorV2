import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  fetchEventLibraryItems,
  fetchEventNotificationState,
  fetchEvents,
  fetchNewsDrivenEvents,
  fetchActiveEventUsers,
  setAllEventNotifications,
  setEventNotificationSubscription,
  type ActiveEventUserPresence,
  type AppEvent,
  type EventLibraryItem,
  type NewsDrivenEventItem,
} from '../lib/api/data';
import { generateNewsDrivenEvents } from '../lib/api/functions';
import { clientEnv } from '../lib/env';
import { supabase } from '../lib/supabase';
import { loadMapboxModule } from './events/loadMapboxModule';
import {
  EVENTS_PANEL_HEIGHT,
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SCREEN_PAD_X,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { CARD_PADDING_LG } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;
type LibraryMode = 'favorites' | 'recent' | null;
type CategoryFilter = 'All' | string | null;
type EventStatusChip = 'live' | 'soon' | 'upcoming';

type ScheduledEventOccurrence = {
  body: string;
  category: string;
  durationMinutes: number;
  favoriteKey: string;
  occurrenceKey: string;
  script: string;
  source: 'news' | 'template';
  startsAt: string;
  startsCount: number;
  status: EventStatusChip;
  title: string;
};

const HORIZON_DAYS = 7;
const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;
const NEXT_24_HOURS_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_HOURS_LOCAL = [0, 3, 6, 9, 12, 15, 18, 21];

type Coordinate = [number, number];
type GlobePointKind = 'live' | 'news' | 'prayer' | 'scheduled' | 'user';
type MapboxComponent = ComponentType<Record<string, unknown>>;

interface GlobePoint {
  coordinate: Coordinate;
  id: string;
  kind: GlobePointKind;
}

interface MapboxGlobeModule {
  Camera?: unknown;
  CircleLayer?: unknown;
  MapView?: unknown;
  ShapeSource?: unknown;
  StyleURL?: Record<string, string>;
  setAccessToken?: (token: string) => void;
}

interface MapFeatureCollection {
  features: Array<{
    geometry: {
      coordinates: Coordinate;
      type: 'Point';
    };
    properties: {
      id: string;
    };
    type: 'Feature';
  }>;
  type: 'FeatureCollection';
}

const MAP_COLORS = {
  live: '#ff4040',
  news: '#ffd65a',
  prayer: '#a974ff',
  scheduled: '#4a8fff',
  user: '#37cf7a',
} as const;

const MAJOR_CITY_COORDINATES: Coordinate[] = [
  [-74.006, 40.7128], // New York
  [-118.2437, 34.0522], // Los Angeles
  [-79.3832, 43.6532], // Toronto
  [-99.1332, 19.4326], // Mexico City
  [-46.6333, -23.5505], // Sao Paulo
  [-58.3816, -34.6037], // Buenos Aires
  [-0.1276, 51.5072], // London
  [2.3522, 48.8566], // Paris
  [13.405, 52.52], // Berlin
  [-3.7038, 40.4168], // Madrid
  [31.2357, 30.0444], // Cairo
  [35.2137, 31.7683], // Jerusalem
  [37.6173, 55.7558], // Moscow
  [28.9784, 41.0082], // Istanbul
  [55.2708, 25.2048], // Dubai
  [72.8777, 19.076], // Mumbai
  [77.209, 28.6139], // Delhi
  [90.4125, 23.8103], // Dhaka
  [67.0099, 24.8615], // Karachi
  [116.4074, 39.9042], // Beijing
  [121.4737, 31.2304], // Shanghai
  [139.6917, 35.6895], // Tokyo
  [126.978, 37.5665], // Seoul
  [103.8198, 1.3521], // Singapore
  [100.5018, 13.7563], // Bangkok
  [106.8456, -6.2088], // Jakarta
  [151.2093, -33.8688], // Sydney
  [144.9631, -37.8136], // Melbourne
  [174.7633, -36.8485], // Auckland
  [18.4241, -33.9249], // Cape Town
  [28.0473, -26.2041], // Johannesburg
  [36.8219, -1.2921], // Nairobi
  [3.3792, 6.5244], // Lagos
];

const COUNTRY_CODE_TO_COORDINATE: Record<string, Coordinate> = {
  AE: [55.2708, 25.2048],
  AR: [-58.3816, -34.6037],
  AU: [151.2093, -33.8688],
  BR: [-46.6333, -23.5505],
  CA: [-79.3832, 43.6532],
  CN: [116.4074, 39.9042],
  DE: [13.405, 52.52],
  EG: [31.2357, 30.0444],
  ES: [-3.7038, 40.4168],
  FR: [2.3522, 48.8566],
  GB: [-0.1276, 51.5072],
  IN: [77.209, 28.6139],
  IT: [12.4964, 41.9028],
  JP: [139.6917, 35.6895],
  KE: [36.8219, -1.2921],
  KR: [126.978, 37.5665],
  MX: [-99.1332, 19.4326],
  NG: [3.3792, 6.5244],
  NZ: [174.7633, -36.8485],
  PK: [67.0099, 24.8615],
  PT: [-9.1393, 38.7223],
  RU: [37.6173, 55.7558],
  TR: [28.9784, 41.0082],
  UA: [30.5234, 50.4501],
  US: [-74.006, 40.7128],
  ZA: [28.0473, -26.2041],
};

const LOCATION_KEYWORDS: Array<{ coordinate: Coordinate; keywords: string[] }> = [
  { coordinate: [35.2137, 31.7683], keywords: ['palestine', 'gaza', 'west bank', 'jerusalem'] },
  { coordinate: [30.5234, 50.4501], keywords: ['ukraine', 'kyiv', 'kiev'] },
  { coordinate: [36.2913, 33.5138], keywords: ['syria', 'damascus'] },
  { coordinate: [32.5599, 15.5007], keywords: ['sudan', 'khartoum'] },
  { coordinate: [29.9187, 31.2001], keywords: ['rafah'] },
  { coordinate: [67.0099, 24.8615], keywords: ['pakistan', 'karachi'] },
  { coordinate: [90.4125, 23.8103], keywords: ['bangladesh', 'dhaka'] },
  { coordinate: [44.3661, 33.3152], keywords: ['iraq', 'baghdad'] },
  { coordinate: [35.5018, 33.8938], keywords: ['lebanon', 'beirut'] },
  { coordinate: [79.8612, 6.9271], keywords: ['sri lanka', 'colombo'] },
  { coordinate: [85.324, 27.7172], keywords: ['nepal', 'kathmandu'] },
  { coordinate: [126.978, 37.5665], keywords: ['south korea', 'seoul'] },
  { coordinate: [121.5654, 25.033], keywords: ['taiwan', 'taipei'] },
  { coordinate: [44.0092, 36.1911], keywords: ['kurdistan', 'erbil'] },
];

function clampCoordinate([longitude, latitude]: Coordinate): Coordinate {
  const clampedLongitude = Math.max(-180, Math.min(180, longitude));
  const clampedLatitude = Math.max(-85, Math.min(85, latitude));
  return [clampedLongitude, clampedLatitude];
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function jitterCoordinate(coordinate: Coordinate, seed: string, spread = 0.65): Coordinate {
  const hash = stableHash(seed || 'seed');
  const longitudeJitter = ((hash % 1000) / 1000 - 0.5) * spread;
  const latitudeJitter = (((hash >> 5) % 1000) / 1000 - 0.5) * spread;
  return clampCoordinate([coordinate[0] + longitudeJitter, coordinate[1] + latitudeJitter]);
}

function coordinateFromKeyword(text: string): Coordinate | null {
  const normalized = text.toLowerCase();
  for (const location of LOCATION_KEYWORDS) {
    if (location.keywords.some((keyword) => normalized.includes(keyword))) {
      return location.coordinate;
    }
  }
  return null;
}

function resolveEventCoordinate(input: {
  countryCode?: string | null;
  description?: string | null;
  region?: string | null;
  seed: string;
  title: string;
}): Coordinate {
  const text = `${input.title} ${input.description ?? ''} ${input.region ?? ''}`.trim();
  const keywordCoordinate = coordinateFromKeyword(text);
  if (keywordCoordinate) {
    return jitterCoordinate(keywordCoordinate, input.seed, 0.35);
  }

  const countryCode = input.countryCode?.trim().toUpperCase();
  if (countryCode && COUNTRY_CODE_TO_COORDINATE[countryCode]) {
    return jitterCoordinate(COUNTRY_CODE_TO_COORDINATE[countryCode], input.seed, 0.5);
  }

  const fallbackIndex = stableHash(input.seed) % MAJOR_CITY_COORDINATES.length;
  const fallbackCoordinate = MAJOR_CITY_COORDINATES[fallbackIndex] ?? [0, 0];
  return jitterCoordinate(fallbackCoordinate, input.seed, 0.8);
}

function isWithinNext24Hours(startIso: string, durationMinutes: number, nowMillis: number) {
  const startMillis = new Date(startIso).getTime();
  if (!Number.isFinite(startMillis)) {
    return false;
  }

  const endMillis = startMillis + Math.max(1, durationMinutes) * 60 * 1000;
  const horizonMillis = nowMillis + NEXT_24_HOURS_MS;
  return endMillis > nowMillis && startMillis <= horizonMillis;
}

function toFeatureCollection(points: GlobePoint[]): MapFeatureCollection {
  return {
    features: points.map((point) => ({
      geometry: {
        coordinates: point.coordinate,
        type: 'Point' as const,
      },
      properties: {
        id: point.id,
      },
      type: 'Feature' as const,
    })),
    type: 'FeatureCollection',
  };
}

function normalizeCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value && value.length > 0 ? value : 'Manifestation';
}

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

function toOccurrenceStatus(
  startIso: string,
  durationMinutes: number,
  nowMillis: number,
): EventStatusChip {
  const startMillis = new Date(startIso).getTime();
  const endMillis = startMillis + durationMinutes * 60 * 1000;

  if (nowMillis >= startMillis && nowMillis < endMillis) {
    return 'live';
  }

  if (startMillis > nowMillis && startMillis - nowMillis <= SOON_WINDOW_MS) {
    return 'soon';
  }

  return 'upcoming';
}

function formatOccurrenceStartLabel(startIso: string) {
  const date = new Date(startIso);
  if (Number.isNaN(date.getTime())) {
    return 'Upcoming';
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function buildTemplateScheduleSlots(nowDate: Date) {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const slots: Date[] = [];

  const startOfToday = new Date(nowDate);
  startOfToday.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < HORIZON_DAYS; dayOffset += 1) {
    for (const hour of SCHEDULE_HOURS_LOCAL) {
      const startAt = new Date(startOfToday);
      startAt.setDate(startOfToday.getDate() + dayOffset);
      startAt.setHours(hour, 0, 0, 0);

      const endAt = new Date(startAt.getTime() + 15 * 60 * 1000);
      if (endAt.getTime() <= nowMillis) {
        continue;
      }

      if (startAt.getTime() > horizonMillis) {
        continue;
      }

      slots.push(startAt);
    }
  }

  return slots;
}

function buildScheduledTemplateEvents(
  items: EventLibraryItem[],
  nowDate: Date,
): ScheduledEventOccurrence[] {
  const slots = buildTemplateScheduleSlots(nowDate);
  if (slots.length === 0 || items.length === 0) {
    return [];
  }

  const sortedItems = items.slice().sort((left, right) => left.title.localeCompare(right.title));
  const maxCount = Math.min(sortedItems.length, slots.length);
  const nowMillis = nowDate.getTime();

  return Array.from({ length: maxCount }).map((_, index) => {
    const item = sortedItems[index];
    const slot = slots[index];
    const startsAt = (slot ?? new Date(nowDate.getTime() + index * 60 * 60 * 1000)).toISOString();
    const status = toOccurrenceStatus(startsAt, item?.durationMinutes ?? 10, nowMillis);

    return {
      body: item?.body ?? '',
      category: normalizeCategory(item?.category),
      durationMinutes: item?.durationMinutes ?? 10,
      favoriteKey: item?.id ?? `template-${index}`,
      occurrenceKey: `template:${item?.id}:${startsAt}`,
      script: item?.script ?? item?.body ?? '',
      source: 'template',
      startsAt,
      startsCount: item?.startsCount ?? 0,
      status,
      title: item?.title ?? 'Manifestation Event',
    } satisfies ScheduledEventOccurrence;
  });
}

function buildScheduledNewsEvents(
  items: NewsDrivenEventItem[],
  nowDate: Date,
): ScheduledEventOccurrence[] {
  const nowMillis = nowDate.getTime();
  const horizonMillis = nowMillis + HORIZON_DAYS * 24 * 60 * 60 * 1000;

  return items
    .filter((item) => {
      const startMillis = new Date(item.startsAt).getTime();
      if (!Number.isFinite(startMillis)) {
        return false;
      }
      const endMillis = startMillis + item.durationMinutes * 60 * 1000;
      return endMillis > nowMillis && startMillis <= horizonMillis;
    })
    .map((item) => {
      return {
        body: item.summary,
        category: `News - ${normalizeCategory(item.category)}`,
        durationMinutes: item.durationMinutes,
        favoriteKey: item.id,
        occurrenceKey: `news:${item.id}:${item.startsAt}`,
        script: item.script,
        source: 'news',
        startsAt: item.startsAt,
        startsCount: 0,
        status: toOccurrenceStatus(item.startsAt, item.durationMinutes, nowMillis),
        title: item.title,
      } satisfies ScheduledEventOccurrence;
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function FilterChip({
  active,
  fill = false,
  icon,
  label,
  onPress,
  size = 'md',
}: {
  active: boolean;
  fill?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'md' | 'sm';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chipBase,
        size === 'sm' ? styles.chipSm : styles.chipMd,
        fill && styles.chipFill,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.chipContentRow}>
        {icon ? (
          <MaterialCommunityIcons
            color={active ? figmaV2Reference.text.activeTab : colors.textLabel}
            name={icon}
            size={14}
          />
        ) : null}
        <Typography
          allowFontScaling={false}
          color={active ? figmaV2Reference.text.activeTab : colors.textLabel}
          style={styles.chipText}
          variant="Caption"
          weight="bold"
        >
          {label}
        </Typography>
      </View>
    </Pressable>
  );
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const { width: windowWidth } = useWindowDimensions();
  const mapboxModule = useMemo(() => loadMapboxModule() as MapboxGlobeModule | null, []);
  const MapboxMapView = mapboxModule?.MapView as MapboxComponent | undefined;
  const MapboxCamera = mapboxModule?.Camera as MapboxComponent | undefined;
  const MapboxShapeSource = mapboxModule?.ShapeSource as MapboxComponent | undefined;
  const MapboxCircleLayer = mapboxModule?.CircleLayer as MapboxComponent | undefined;
  const globeCameraRef = useRef<{ setCamera?: (config: Record<string, unknown>) => void } | null>(
    null,
  );

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libraryItems, setLibraryItems] = useState<EventLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<LibraryMode>('recent');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeSlideByCategory, setActiveSlideByCategory] = useState<
    Partial<Record<string, number>>
  >({});
  const [libraryRailWidth, setLibraryRailWidth] = useState<number | null>(null);

  const [newsItems, setNewsItems] = useState<NewsDrivenEventItem[]>([]);
  const [activePresence, setActivePresence] = useState<ActiveEventUserPresence[]>([]);
  const [deviceCoordinate, setDeviceCoordinate] = useState<Coordinate | null>(null);
  const [globeHeading, setGlobeHeading] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [subscribedAll, setSubscribedAll] = useState(false);
  const [subscribedKeys, setSubscribedKeys] = useState<string[]>([]);
  const [updatingSubscriptionKey, setUpdatingSubscriptionKey] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  const mapboxReady =
    Boolean(clientEnv.mapboxToken) &&
    Boolean(MapboxMapView) &&
    Boolean(MapboxCamera) &&
    Boolean(MapboxShapeSource) &&
    Boolean(MapboxCircleLayer);
  const MapboxMapViewComponent = MapboxMapView as MapboxComponent;
  const MapboxCameraComponent = MapboxCamera as MapboxComponent;
  const MapboxShapeSourceComponent = MapboxShapeSource as MapboxComponent;
  const MapboxCircleLayerComponent = MapboxCircleLayer as MapboxComponent;

  const loadEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await fetchEvents(120);
      setEvents(nextEvents);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);

    try {
      const nextLibraryItems = await fetchEventLibraryItems(80);
      setLibraryItems(nextLibraryItems);
      setLibraryError(null);
    } catch (nextError) {
      setLibraryError(
        nextError instanceof Error ? nextError.message : 'Failed to load event library.',
      );
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const syncNewsEvents = useCallback(async () => {
    try {
      await generateNewsDrivenEvents();
      const nextNewsItems = await fetchNewsDrivenEvents(80);
      setNewsItems(nextNewsItems);
    } catch {
      try {
        const fallbackNewsItems = await fetchNewsDrivenEvents(80);
        setNewsItems(fallbackNewsItems);
      } catch {
        // Ignore secondary failure.
      }
    }
  }, []);

  const loadActivePresence = useCallback(async () => {
    try {
      const nextPresence = await fetchActiveEventUsers(15);
      setActivePresence(nextPresence);
    } catch {
      setActivePresence([]);
    }
  }, []);

  const loadNotificationState = useCallback(async (nextUserId: string) => {
    try {
      const state = await fetchEventNotificationState(nextUserId);
      setSubscribedAll(state.subscribedAll);
      setSubscribedKeys(state.subscriptionKeys);
    } catch {
      setSubscribedAll(false);
      setSubscribedKeys([]);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
    void loadLibrary();
    void syncNewsEvents();
    void loadActivePresence();
  }, [loadActivePresence, loadEvents, loadLibrary, syncNewsEvents]);

  useEffect(() => {
    let active = true;

    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();
      const nextUserId = data.user?.id ?? null;
      if (!active) {
        return;
      }

      setUserId(nextUserId);
      if (nextUserId) {
        await loadNotificationState(nextUserId);
      }
    };

    void hydrateUser();

    return () => {
      active = false;
    };
  }, [loadNotificationState]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void loadActivePresence();
  }, [loadActivePresence, nowTick]);

  useEffect(() => {
    if (!mapboxReady || !mapboxModule?.setAccessToken || !clientEnv.mapboxToken) {
      return;
    }

    mapboxModule.setAccessToken(clientEnv.mapboxToken);
  }, [mapboxModule, mapboxReady]);

  useEffect(() => {
    if (!mapboxReady) {
      return;
    }

    let active = true;

    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!active) {
        return;
      }

      setDeviceCoordinate(
        clampCoordinate([currentLocation.coords.longitude, currentLocation.coords.latitude]),
      );
    };

    void requestLocation();

    return () => {
      active = false;
    };
  }, [mapboxReady]);

  useEffect(() => {
    if (!mapboxReady) {
      return;
    }

    const pulseInterval = setInterval(() => {
      setPulseTick((current) => (current + 1) % 1000);
    }, 450);

    const rotationInterval = setInterval(() => {
      setGlobeHeading((current) => (current + 0.6) % 360);
    }, 120);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(rotationInterval);
    };
  }, [mapboxReady]);

  useEffect(() => {
    if (!mapboxReady) {
      return;
    }

    globeCameraRef.current?.setCamera?.({
      animationDuration: 120,
      animationMode: 'linearTo',
      centerCoordinate: [0, 20],
      heading: globeHeading,
      pitch: 0,
      zoomLevel: 0.9,
    });
  }, [globeHeading, mapboxReady]);

  const visibleEvents = useMemo(() => events.slice(0, 2), [events]);
  const primaryEventId = visibleEvents[0]?.id;

  const scheduledTemplateEvents = useMemo(
    () => buildScheduledTemplateEvents(libraryItems, new Date(nowTick)),
    [libraryItems, nowTick],
  );

  const scheduledNewsEvents = useMemo(
    () => buildScheduledNewsEvents(newsItems, new Date(nowTick)),
    [newsItems, nowTick],
  );

  const allScheduledEvents = useMemo(
    () =>
      [...scheduledTemplateEvents, ...scheduledNewsEvents].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
    [scheduledNewsEvents, scheduledTemplateEvents],
  );

  const favoriteCount = favoriteIds.filter((id) =>
    allScheduledEvents.some((item) => item.favoriteKey === id),
  ).length;
  const recentCount = allScheduledEvents.length;

  const visibleLibrary = useMemo(() => {
    if (libraryMode === 'favorites') {
      return allScheduledEvents.filter((item) => favoriteIds.includes(item.favoriteKey));
    }

    return allScheduledEvents;
  }, [allScheduledEvents, favoriteIds, libraryMode]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(visibleLibrary.map((item) => normalizeCategory(item.category)))).sort(
      (left, right) => left.localeCompare(right),
    );
  }, [visibleLibrary]);

  const categoryFilters = useMemo(() => ['All', ...availableCategories], [availableCategories]);

  useEffect(() => {
    if (
      selectedCategory &&
      selectedCategory !== 'All' &&
      !availableCategories.includes(selectedCategory)
    ) {
      setSelectedCategory('All');
    }
  }, [availableCategories, selectedCategory]);

  const sections = useMemo(() => {
    const scopedCategories =
      !selectedCategory || selectedCategory === 'All'
        ? availableCategories
        : availableCategories.filter((category) => category === selectedCategory);

    return scopedCategories
      .map((category) => ({
        category,
        items: visibleLibrary.filter((item) => normalizeCategory(item.category) === category),
      }))
      .filter((section) => section.items.length > 0);
  }, [availableCategories, selectedCategory, visibleLibrary]);

  const fallbackEventCardWidth = useMemo(() => {
    const laneWidth = windowWidth - SCREEN_PAD_X * 2 - CARD_PADDING_LG * 2 - 2;
    return Math.max(200, laneWidth);
  }, [windowWidth]);

  const eventCardWidth =
    libraryRailWidth && libraryRailWidth > 0 ? libraryRailWidth : fallbackEventCardWidth;

  const eventCardStep = useMemo(() => eventCardWidth + HOME_CARD_GAP, [eventCardWidth]);
  const pulseProgress = useMemo(
    () => (Math.sin((pulseTick / 10) * Math.PI * 2) + 1) / 2,
    [pulseTick],
  );

  const eventCoordinatesById = useMemo(() => {
    const byId = new Map<string, Coordinate>();
    for (const event of events) {
      byId.set(
        event.id,
        resolveEventCoordinate({
          countryCode: event.countryCode,
          description: event.description,
          region: event.region,
          seed: event.id,
          title: event.title,
        }),
      );
    }
    return byId;
  }, [events]);

  const mapRingPoints = useMemo(() => {
    const nowMillis = nowTick;
    const points: GlobePoint[] = [];

    for (const event of events) {
      if (!isWithinNext24Hours(event.startsAt, event.durationMinutes, nowMillis)) {
        continue;
      }

      points.push({
        coordinate:
          eventCoordinatesById.get(event.id) ??
          resolveEventCoordinate({
            countryCode: event.countryCode,
            description: event.description,
            region: event.region,
            seed: event.id,
            title: event.title,
          }),
        id: `event-${event.id}`,
        kind: event.status === 'live' ? 'live' : 'scheduled',
      });
    }

    for (const occurrence of allScheduledEvents) {
      if (!isWithinNext24Hours(occurrence.startsAt, occurrence.durationMinutes, nowMillis)) {
        continue;
      }

      const coordinate = resolveEventCoordinate({
        description: occurrence.body,
        region: occurrence.category,
        seed: occurrence.occurrenceKey,
        title: occurrence.title,
      });

      const kind: GlobePointKind =
        occurrence.status === 'live' ? 'live' : occurrence.source === 'news' ? 'news' : 'prayer';

      points.push({
        coordinate,
        id: `occurrence-${occurrence.occurrenceKey}`,
        kind,
      });
    }

    return points;
  }, [allScheduledEvents, eventCoordinatesById, events, nowTick]);

  const mapUserPoints = useMemo(() => {
    const dedupedPresenceByUser = new Map<string, ActiveEventUserPresence>();

    for (const entry of activePresence) {
      const existing = dedupedPresenceByUser.get(entry.userId);
      if (!existing) {
        dedupedPresenceByUser.set(entry.userId, entry);
        continue;
      }

      const existingTime = new Date(existing.lastSeenAt).getTime();
      const nextTime = new Date(entry.lastSeenAt).getTime();
      if (nextTime > existingTime) {
        dedupedPresenceByUser.set(entry.userId, entry);
      }
    }

    const points: GlobePoint[] = [];
    for (const presence of dedupedPresenceByUser.values()) {
      const baseCoordinate =
        eventCoordinatesById.get(presence.eventId) ??
        resolveEventCoordinate({
          seed: `${presence.eventId}-${presence.userId}`,
          title: `participant-${presence.eventId}`,
        });

      points.push({
        coordinate: jitterCoordinate(baseCoordinate, presence.userId, 0.3),
        id: `user-${presence.userId}`,
        kind: 'user',
      });
    }

    if (deviceCoordinate) {
      points.unshift({
        coordinate: deviceCoordinate,
        id: 'user-device',
        kind: 'user',
      });
    }

    return points;
  }, [activePresence, deviceCoordinate, eventCoordinatesById]);

  const liveRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'live')),
    [mapRingPoints],
  );
  const scheduledRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'scheduled')),
    [mapRingPoints],
  );
  const prayerRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'prayer')),
    [mapRingPoints],
  );
  const newsRingGeoJson = useMemo(
    () => toFeatureCollection(mapRingPoints.filter((point) => point.kind === 'news')),
    [mapRingPoints],
  );
  const userGeoJson = useMemo(() => toFeatureCollection(mapUserPoints), [mapUserPoints]);

  const ringLayerStyle = useCallback(
    (color: string, baseRadius: number) => ({
      circleColor: 'rgba(0,0,0,0)',
      circleRadius: baseRadius + pulseProgress * 8,
      circleStrokeColor: color,
      circleStrokeOpacity: 0.2 + (1 - pulseProgress) * 0.45,
      circleStrokeWidth: 2,
    }),
    [pulseProgress],
  );

  const coreLayerStyle = useCallback((color: string, radius: number) => {
    return {
      circleColor: color,
      circleOpacity: 0.95,
      circleRadius: radius,
      circleStrokeColor: 'rgba(255,255,255,0.38)',
      circleStrokeWidth: 1,
    };
  }, []);

  const mapboxStyleUrl = useMemo(() => {
    const styleByModule = mapboxModule?.StyleURL?.SatelliteStreet;
    if (typeof styleByModule === 'string' && styleByModule.length > 0) {
      return styleByModule;
    }
    return 'mapbox://styles/mapbox/satellite-streets-v12';
  }, [mapboxModule]);

  const mapFallbackReason = useMemo(() => {
    if (!clientEnv.mapboxToken) {
      return 'Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in mobile/.env.';
    }
    if (!mapboxReady) {
      return 'Mapbox globe needs a development build because Expo Go does not include @rnmapbox/maps.';
    }
    return '';
  }, [mapboxReady]);

  const toggleFavorite = (favoriteKey: string) => {
    setFavoriteIds((current) => {
      if (current.includes(favoriteKey)) {
        return current.filter((id) => id !== favoriteKey);
      }

      return [...current, favoriteKey];
    });
  };

  const onOpenOccurrence = (occurrence: ScheduledEventOccurrence) => {
    const params: EventsStackParamList['EventRoom'] = {
      durationMinutes: occurrence.durationMinutes,
      eventSource: occurrence.source,
      eventTitle: occurrence.title,
      occurrenceKey: occurrence.occurrenceKey,
      scheduledStartAt: occurrence.startsAt,
      scriptText: occurrence.script,
      ...(occurrence.source === 'template' ? { eventTemplateId: occurrence.favoriteKey } : {}),
    };

    navigation.navigate('EventRoom', params);
  };

  const toggleSubscribeAll = async () => {
    if (!userId) {
      setError('Sign in to subscribe for event notifications.');
      return;
    }

    setUpdatingSubscriptionKey('all');
    try {
      const nextValue = !subscribedAll;
      await setAllEventNotifications(userId, nextValue);
      setSubscribedAll(nextValue);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update subscriptions.');
    } finally {
      setUpdatingSubscriptionKey(null);
    }
  };

  const toggleOccurrenceSubscription = async (occurrenceKey: string) => {
    if (!userId) {
      setError('Sign in to subscribe for event notifications.');
      return;
    }

    setUpdatingSubscriptionKey(occurrenceKey);
    try {
      if (subscribedAll) {
        await setAllEventNotifications(userId, false);
        await setEventNotificationSubscription({
          enabled: true,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedAll(false);
        setSubscribedKeys([occurrenceKey]);
      } else if (subscribedKeys.includes(occurrenceKey)) {
        await setEventNotificationSubscription({
          enabled: false,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedKeys((current) => current.filter((value) => value !== occurrenceKey));
      } else {
        await setEventNotificationSubscription({
          enabled: true,
          subscriptionKey: occurrenceKey,
          userId,
        });
        setSubscribedKeys((current) => [...current, occurrenceKey]);
      }

      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update subscriptions.');
    } finally {
      setUpdatingSubscriptionKey(null);
    }
  };

  const statusChipStyle = (status: EventStatusChip) => {
    if (status === 'live') {
      return styles.statusChipLive;
    }
    if (status === 'soon') {
      return styles.statusChipSoon;
    }
    return styles.statusChipUpcoming;
  };

  const statusLabel = (status: EventStatusChip) => {
    if (status === 'live') {
      return 'Live';
    }
    if (status === 'soon') {
      return 'Soon';
    }
    return 'Upcoming';
  };

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
          {mapboxReady ? (
            <View style={styles.globeMapFrame}>
              <MapboxMapViewComponent
                attributionEnabled={false}
                compassEnabled={false}
                localizeLabels={false}
                logoEnabled={false}
                pitchEnabled={false}
                projection="globe"
                rotateEnabled={false}
                scaleBarEnabled={false}
                scrollEnabled={false}
                style={styles.globeMap}
                styleURL={mapboxStyleUrl}
                zoomEnabled
              >
                <MapboxCameraComponent
                  ref={globeCameraRef}
                  animationDuration={120}
                  animationMode="linearTo"
                  centerCoordinate={[0, 20]}
                  heading={globeHeading}
                  pitch={0}
                  zoomLevel={0.9}
                />

                {liveRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent id="events-live-source" shape={liveRingGeoJson}>
                    <MapboxCircleLayerComponent
                      id="events-live-ring"
                      style={ringLayerStyle(MAP_COLORS.live, 10)}
                    />
                    <MapboxCircleLayerComponent
                      id="events-live-core"
                      style={coreLayerStyle(MAP_COLORS.live, 3.8)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {scheduledRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    id="events-scheduled-source"
                    shape={scheduledRingGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id="events-scheduled-ring"
                      style={ringLayerStyle(MAP_COLORS.scheduled, 9)}
                    />
                    <MapboxCircleLayerComponent
                      id="events-scheduled-core"
                      style={coreLayerStyle(MAP_COLORS.scheduled, 3.4)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {prayerRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent id="events-prayer-source" shape={prayerRingGeoJson}>
                    <MapboxCircleLayerComponent
                      id="events-prayer-ring"
                      style={ringLayerStyle(MAP_COLORS.prayer, 9.5)}
                    />
                    <MapboxCircleLayerComponent
                      id="events-prayer-core"
                      style={coreLayerStyle(MAP_COLORS.prayer, 3.4)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {newsRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent id="events-news-source" shape={newsRingGeoJson}>
                    <MapboxCircleLayerComponent
                      id="events-news-ring"
                      style={ringLayerStyle(MAP_COLORS.news, 9.5)}
                    />
                    <MapboxCircleLayerComponent
                      id="events-news-core"
                      style={coreLayerStyle(MAP_COLORS.news, 3.4)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {userGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent id="events-online-users-source" shape={userGeoJson}>
                    <MapboxCircleLayerComponent
                      id="events-online-users-core"
                      style={coreLayerStyle(MAP_COLORS.user, 3.2)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}
              </MapboxMapViewComponent>
            </View>
          ) : (
            <View style={styles.globeFallbackWrap}>
              <LottieView
                autoPlay
                loop
                source={globeFallbackAnimation}
                style={styles.globeAnimation}
              />
              <Typography
                allowFontScaling={false}
                color={colors.textSecondary}
                style={styles.mapFallbackText}
                variant="Caption"
              >
                {mapFallbackReason}
              </Typography>
            </View>
          )}
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
          onPress={() => {
            void Promise.all([loadEvents(true), syncNewsEvents(), loadActivePresence()]);
          }}
          title="Refresh events"
          variant="secondary"
        />
      </SurfaceCard>

      <View style={styles.topFilterRow}>
        <FilterChip
          active={libraryMode === 'favorites'}
          fill
          label={`Favorites (${favoriteCount})`}
          onPress={() =>
            setLibraryMode((current) => (current === 'favorites' ? null : 'favorites'))
          }
        />
        <FilterChip
          active={libraryMode === 'recent'}
          fill
          label={`Recent (${recentCount})`}
          onPress={() => setLibraryMode((current) => (current === 'recent' ? null : 'recent'))}
        />
        <FilterChip
          active={subscribedAll}
          icon={subscribedAll ? 'bell-ring' : 'bell-outline'}
          label="All alerts"
          onPress={() => {
            void toggleSubscribeAll();
          }}
        />
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryRail}
        showsHorizontalScrollIndicator={false}
      >
        {categoryFilters.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategory === category}
            label={category}
            onPress={() =>
              setSelectedCategory((current) => (current === category ? null : category))
            }
            size="sm"
          />
        ))}
      </ScrollView>

      {libraryLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentMintStart} />
        </View>
      ) : null}

      {libraryError ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            Could not load event templates
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            {libraryError}
          </Typography>
          <Button onPress={() => void loadLibrary()} title="Retry" variant="secondary" />
        </SurfaceCard>
      ) : null}

      {!libraryLoading && !libraryError && sections.length === 0 ? (
        <SurfaceCard radius="xl" style={styles.emptyStateCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            No events in this filter
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary}>
            Try another category or switch filters.
          </Typography>
        </SurfaceCard>
      ) : null}

      {!libraryLoading && !libraryError
        ? sections.map((section) => (
            <SurfaceCard key={section.category} radius="xl" style={styles.categorySection}>
              <View style={styles.sectionHeaderRow}>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {section.category}
                </Typography>
                <Typography
                  allowFontScaling={false}
                  color={colors.textSecondary}
                  variant="Body"
                  weight="bold"
                >
                  {`${section.items.length} events`}
                </Typography>
              </View>

              <ScrollView
                horizontal
                decelerationRate="fast"
                onLayout={(event) => {
                  const measuredWidth = event.nativeEvent.layout.width;
                  if (
                    measuredWidth > 0 &&
                    (libraryRailWidth === null || Math.abs(libraryRailWidth - measuredWidth) > 1)
                  ) {
                    setLibraryRailWidth(measuredWidth);
                  }
                }}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / eventCardStep);
                  const clampedIndex = Math.max(0, Math.min(section.items.length - 1, nextIndex));
                  setActiveSlideByCategory((current) => ({
                    ...current,
                    [section.category]: clampedIndex,
                  }));
                }}
                snapToAlignment="start"
                snapToInterval={eventCardStep}
                contentContainerStyle={styles.prayerRail}
                showsHorizontalScrollIndicator={false}
              >
                {section.items.map((item) => {
                  const isFavorite = favoriteIds.includes(item.favoriteKey);
                  const isSubscribed = subscribedAll || subscribedKeys.includes(item.occurrenceKey);
                  const isUpdatingBell = updatingSubscriptionKey === item.occurrenceKey;
                  const status = statusLabel(item.status);
                  const statusStyle = statusChipStyle(item.status);

                  return (
                    <Pressable
                      key={item.occurrenceKey}
                      onPress={() => onOpenOccurrence(item)}
                      style={({ pressed }) => [pressed && styles.prayerCardPressed]}
                    >
                      <SurfaceCard
                        contentPadding={spacing.sm}
                        radius="md"
                        style={[styles.prayerCard, { width: eventCardWidth }]}
                        variant="homeStatSmall"
                      >
                        <View style={styles.prayerCardHeader}>
                          <View style={styles.cardTitleWrap}>
                            <Typography
                              allowFontScaling={false}
                              numberOfLines={2}
                              style={styles.prayerTitle}
                              variant="H2"
                              weight="bold"
                            >
                              {item.title}
                            </Typography>
                            <View style={[styles.statusChip, statusStyle]}>
                              <Typography
                                allowFontScaling={false}
                                color={colors.textOnSky}
                                style={styles.statusChipText}
                                variant="Caption"
                                weight="bold"
                              >
                                {status}
                              </Typography>
                            </View>
                          </View>
                          <View style={styles.cardActionRow}>
                            <Pressable
                              accessibilityLabel={
                                isFavorite ? 'Remove from favorites' : 'Add to favorites'
                              }
                              onPress={(event) => {
                                event.stopPropagation();
                                toggleFavorite(item.favoriteKey);
                              }}
                              style={({ pressed }) => [
                                styles.actionButton,
                                isFavorite && styles.favoriteButtonActive,
                                pressed && styles.favoritePressed,
                              ]}
                            >
                              <MaterialCommunityIcons
                                color={isFavorite ? colors.textOnSky : colors.textSecondary}
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={18}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={
                                isSubscribed ? 'Disable event alerts' : 'Enable event alerts'
                              }
                              onPress={(event) => {
                                event.stopPropagation();
                                void toggleOccurrenceSubscription(item.occurrenceKey);
                              }}
                              style={({ pressed }) => [
                                styles.actionButton,
                                isSubscribed && styles.subscriptionButtonActive,
                                pressed && styles.favoritePressed,
                              ]}
                            >
                              <MaterialCommunityIcons
                                color={isSubscribed ? colors.textOnSky : colors.textSecondary}
                                name={
                                  isUpdatingBell
                                    ? 'bell-ring-outline'
                                    : isSubscribed
                                      ? 'bell-ring'
                                      : 'bell-outline'
                                }
                                size={18}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <Typography
                          allowFontScaling={false}
                          color={colors.textSecondary}
                          style={styles.prayerBody}
                        >
                          {item.body}
                        </Typography>
                        <Typography
                          allowFontScaling={false}
                          color={colors.accentSkyStart}
                          variant="Body"
                          weight="bold"
                        >
                          {`${item.durationMinutes} min - ${item.category}`}
                        </Typography>
                        <Typography
                          allowFontScaling={false}
                          color={colors.textCaption}
                          variant="Caption"
                        >
                          {formatOccurrenceStartLabel(item.startsAt)}
                        </Typography>
                      </SurfaceCard>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {section.items.length > 1 ? (
                <View style={styles.dotRow}>
                  {section.items.map((item, index) => {
                    const isActive = (activeSlideByCategory[section.category] ?? 0) === index;

                    return (
                      <View
                        key={`${section.category}-${item.occurrenceKey}-dot`}
                        style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
                      />
                    );
                  })}
                </View>
              ) : null}
            </SurfaceCard>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  categoryRail: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  categorySection: {
    gap: spacing.sm,
  },
  chipBase: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  chipContentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  chipFill: {
    flex: 1,
    minWidth: 0,
  },
  chipMd: {
    minHeight: 34,
  },
  chipSm: {
    minHeight: 30,
    minWidth: 60,
  },
  chipActive: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderMedium,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    lineHeight: 14,
    textTransform: 'none',
  },
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  dot: {
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.accentSkyStart,
    borderColor: colors.accentSkyStart,
  },
  dotInactive: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderMedium,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
  },
  emptyStateCard: {
    gap: spacing.xs,
    minHeight: 148,
  },
  favoriteButtonActive: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
  },
  favoritePressed: {
    transform: [{ scale: 0.97 }],
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  globeAnimation: {
    height: 232,
    width: '100%',
  },
  globeFallbackWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    width: '100%',
  },
  globeMap: {
    borderRadius: radii.lg,
    height: 260,
    overflow: 'hidden',
    width: '100%',
  },
  globeMapFrame: {
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 260,
    overflow: 'hidden',
    width: '100%',
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mapFallbackText: {
    textAlign: 'center',
  },
  mainPanel: {
    minHeight: EVENTS_PANEL_HEIGHT,
  },
  prayerBody: {
    minHeight: 68,
  },
  prayerCard: {
    gap: spacing.xs,
    minHeight: 220,
  },
  prayerCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  prayerCardPressed: {
    transform: [{ scale: 0.995 }],
  },
  prayerRail: {
    gap: HOME_CARD_GAP,
    paddingRight: 0,
  },
  prayerTitle: {
    flex: 1,
  },
  section: {
    gap: HOME_CARD_GAP,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusChipLive: {
    backgroundColor: colors.live,
    borderColor: colors.live,
  },
  statusChipSoon: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statusChipText: {
    textTransform: 'uppercase',
  },
  statusChipUpcoming: {
    backgroundColor: colors.accentSkyStart,
    borderColor: colors.accentSkyStart,
  },
  subscriptionButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  topFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
