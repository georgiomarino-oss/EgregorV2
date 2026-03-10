import globeFallbackAnimation from '../../../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

import { Button } from '../../../components/Button';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LiveLogo } from '../../../components/LiveLogo';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { Typography } from '../../../components/Typography';
import type { ActiveEventUserPresence, AppEvent } from '../../../lib/api/data';
import { clientEnv } from '../../../lib/env';
import { loadMapboxModule } from '../../../screens/events/loadMapboxModule';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { PROFILE_ROW_GAP } from '../../../theme/figmaV2Layout';
import {
  colors,
  eventMapColors,
  eventsSurface,
  interaction,
  motion,
  radii,
  sectionVisualThemes,
  spacing,
} from '../../../theme/tokens';
import { useGlobePoints } from '../hooks/useGlobePoints';
import { isFlagshipSeries, isRitual1111Series } from '../services/globeVisualState';
import type {
  MapboxCameraRefLike,
  MapboxComponent,
  MapboxGlobeModule,
  ScheduledEventOccurrence,
} from '../types';
import { easeOutCubic, extractPressedMapFeatureId } from '../utils/globe';
import {
  formatEventSubtitle,
  formatOccurrenceStartLabel,
  statusLabel,
  toOccurrenceStatus,
} from '../utils/occurrence';

const GLOBE_CAMERA_CENTER: [number, number] = [0, 0];
const GLOBE_CAMERA_ZOOM_LEVEL = 0;
const RIPPLE_FRAME_COUNT = 24;
const GLOBE_DIAMETER = 248;
const MAP_TAP_HITBOX = { height: 48, width: 48 };
const GLOBE_AUTO_ROTATE_DEGREES_PER_SECOND = 6;
const GLOBE_AUTO_ROTATE_TICK_MS = 80;
const GLOBE_AUTO_ROTATE_ANIMATION_MS = 140;
const GLOBE_INTERACTION_IDLE_MS = 2400;
const GLOBE_RESET_ANIMATION_MS = 720;
const GLOBE_PROGRAMMATIC_CAMERA_GUARD_MS = 220;
const GLOBE_FULLSCREEN_FEATURE_TAP_GUARD_MS = 280;
const SPOTLIGHT_NEAR_UPCOMING_WINDOW_MS = 3 * 60 * 60 * 1000;
const TRANSPARENT_GLOBE_STYLE_JSON = JSON.stringify({
  version: 8,
  sources: {
    satellite: {
      tileSize: 256,
      type: 'raster',
      url: 'mapbox://mapbox.satellite',
    },
  },
  layers: [
    {
      id: 'background',
      paint: {
        'background-color': 'rgba(0,0,0,0)',
      },
      type: 'background',
    },
    {
      id: 'satellite',
      source: 'satellite',
      type: 'raster',
    },
  ],
});

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Typography
        allowFontScaling={false}
        color={eventsSurface.globe.legendText}
        style={styles.legendText}
        variant="Caption"
        weight="bold"
      >
        {label}
      </Typography>
    </View>
  );
}

interface EmbeddedGlobeCardProps {
  activePresence: ActiveEventUserPresence[];
  allScheduledEvents: ScheduledEventOccurrence[];
  error: string | null;
  events: AppEvent[];
  loading: boolean;
  newsSyncError: string | null;
  nowTick: number;
  onOpenEventDetails: (event: AppEvent) => void;
  onOpenEventRoom: (event: AppEvent) => void;
  onOpenOccurrenceDetails: (occurrence: ScheduledEventOccurrence) => void;
  onOpenOccurrence: (occurrence: ScheduledEventOccurrence) => void;
  visibleEvents: AppEvent[];
}

interface FullscreenSelection {
  occurrence: ScheduledEventOccurrence | null;
  pointId: string;
  sourceType: 'event' | 'occurrence';
  event: AppEvent | null;
}

interface GlobeSummaryChip {
  key: string;
  label: string;
  value: number;
}

export function EmbeddedGlobeCard({
  activePresence,
  allScheduledEvents,
  error,
  events,
  loading,
  newsSyncError,
  nowTick,
  onOpenEventDetails,
  onOpenEventRoom,
  onOpenOccurrenceDetails,
  onOpenOccurrence,
  visibleEvents,
}: EmbeddedGlobeCardProps) {
  const mapboxModule = useMemo(() => loadMapboxModule() as MapboxGlobeModule | null, []);
  const MapboxMapView = mapboxModule?.MapView as MapboxComponent | undefined;
  const MapboxCamera = mapboxModule?.Camera as MapboxComponent | undefined;
  const MapboxShapeSource = mapboxModule?.ShapeSource as MapboxComponent | undefined;
  const MapboxCircleLayer = mapboxModule?.CircleLayer as MapboxComponent | undefined;

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

  const globeCameraRef = useRef<MapboxCameraRefLike | null>(null);
  const globeLongitudeRef = useRef(0);
  const interactionIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticCameraUntilRef = useRef(0);
  const lastShapeSourcePressAtRef = useRef(0);

  const [pulseTick, setPulseTick] = useState(0);
  const [isGlobeMapLoaded, setIsGlobeMapLoaded] = useState(false);
  const [isGlobeInteracting, setIsGlobeInteracting] = useState(false);
  const [isGlobeFullscreen, setIsGlobeFullscreen] = useState(false);
  const [hasConfiguredMapboxToken, setHasConfiguredMapboxToken] = useState(false);
  const [fullscreenSelection, setFullscreenSelection] = useState<FullscreenSelection | null>(null);
  const reduceMotionEnabled = useReducedMotion();
  const reveal = useMemo(() => new Animated.Value(0), []);
  const glowPulse = useMemo(() => new Animated.Value(0), []);
  const fullscreenSettle = useMemo(() => new Animated.Value(0), []);
  const previewSettle = useMemo(() => new Animated.Value(0), []);

  const {
    flagshipAccentGeoJson,
    liveRingGeoJson,
    mapEventByPointId,
    mapOccurrenceByPointId,
    newsRingGeoJson,
    pointInsightByPointId,
    ritualAccentGeoJson,
    upcomingRingGeoJson,
    userGeoJson,
    waitingRingGeoJson,
  } = useGlobePoints({
    activePresence,
    allScheduledEvents,
    nowTick,
  });

  const liveOccurrenceCount = useMemo(
    () => allScheduledEvents.filter((occurrence) => occurrence.status === 'live').length,
    [allScheduledEvents],
  );
  const waitingOccurrenceCount = useMemo(
    () =>
      allScheduledEvents.filter(
        (occurrence) => occurrence.status === 'waiting_room' || occurrence.status === 'soon',
      ).length,
    [allScheduledEvents],
  );
  const ritualOccurrenceCount = useMemo(
    () => allScheduledEvents.filter((occurrence) => isRitual1111Series(occurrence.seriesKey)).length,
    [allScheduledEvents],
  );
  const flagshipOccurrenceCount = useMemo(
    () => allScheduledEvents.filter((occurrence) => isFlagshipSeries(occurrence.seriesKey)).length,
    [allScheduledEvents],
  );
  const uniqueParticipants = useMemo(() => {
    const uniqueUsers = new Set(activePresence.map((entry) => entry.userId));
    return uniqueUsers.size;
  }, [activePresence]);
  const globeSummaryChips = useMemo(() => {
    const candidates: GlobeSummaryChip[] = [
      { key: 'live', label: 'live now', value: liveOccurrenceCount },
      { key: 'opening', label: 'opening soon', value: waitingOccurrenceCount },
      { key: 'ritual', label: '11:11', value: ritualOccurrenceCount },
      { key: 'flagship', label: 'flagship moments', value: flagshipOccurrenceCount },
      { key: 'clusters', label: 'active clusters', value: uniqueParticipants },
    ];

    const nonZero = candidates.filter((chip) => chip.value > 0);
    if (nonZero.length > 0) {
      return nonZero;
    }

    return [{ key: 'quiet', label: 'Field settling', value: 0 }];
  }, [
    flagshipOccurrenceCount,
    liveOccurrenceCount,
    ritualOccurrenceCount,
    uniqueParticipants,
    waitingOccurrenceCount,
  ]);
  const mapboxRuntimeReady = mapboxReady && hasConfiguredMapboxToken;
  const spotlightMoments = useMemo(() => {
    const actionable = allScheduledEvents.filter((occurrence) => {
      const hasCanonicalTarget = Boolean(
        occurrence.occurrenceKey?.trim() ||
          occurrence.occurrenceId?.trim() ||
          occurrence.roomId?.trim(),
      );
      if (!hasCanonicalTarget) {
        return false;
      }

      const startsAtMillis = new Date(occurrence.startsAt).getTime();
      if (!Number.isFinite(startsAtMillis)) {
        return false;
      }

      const endsAtMillis = startsAtMillis + Math.max(1, occurrence.durationMinutes) * 60 * 1000;
      if (nowTick >= endsAtMillis) {
        return false;
      }

      if (occurrence.status === 'live') {
        return true;
      }

      if (occurrence.status === 'waiting_room' || occurrence.status === 'soon') {
        return true;
      }

      if (occurrence.status === 'upcoming') {
        return startsAtMillis > nowTick && startsAtMillis - nowTick <= SPOTLIGHT_NEAR_UPCOMING_WINDOW_MS;
      }

      return false;
    });

    const byPriority = [...actionable].sort((left, right) => {
      const leftPriority =
        left.status === 'live'
          ? 0
          : left.status === 'waiting_room' || left.status === 'soon'
            ? 1
            : 2;
      const rightPriority =
        right.status === 'live'
          ? 0
          : right.status === 'waiting_room' || right.status === 'soon'
            ? 1
            : 2;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (right.startsCount !== left.startsCount) {
        return right.startsCount - left.startsCount;
      }

      return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    });

    const picked: ScheduledEventOccurrence[] = [];
    const seen = new Set<string>();
    const addOccurrence = (occurrence: ScheduledEventOccurrence | undefined) => {
      if (!occurrence) {
        return;
      }
      const key = occurrence.occurrenceId?.trim() || occurrence.occurrenceKey;
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      picked.push(occurrence);
    };

    addOccurrence(byPriority.find((occurrence) => occurrence.status === 'live'));
    addOccurrence(
      byPriority.find(
        (occurrence) => occurrence.status === 'waiting_room' || occurrence.status === 'soon',
      ),
    );
    addOccurrence(byPriority.find((occurrence) => isRitual1111Series(occurrence.seriesKey)));
    addOccurrence(byPriority.find((occurrence) => isFlagshipSeries(occurrence.seriesKey)));
    for (const occurrence of byPriority) {
      addOccurrence(occurrence);
      if (picked.length >= 3) {
        break;
      }
    }

    return picked.slice(0, 3);
  }, [allScheduledEvents, nowTick]);

  useEffect(() => {
    setHasConfiguredMapboxToken(false);

    if (!mapboxReady || !mapboxModule?.setAccessToken || !clientEnv.mapboxToken) {
      return;
    }

    try {
      mapboxModule.setAccessToken(clientEnv.mapboxToken);
      setHasConfiguredMapboxToken(true);
    } catch {
      setHasConfiguredMapboxToken(false);
    }
  }, [mapboxModule, mapboxReady]);

  useEffect(() => {
    if (reduceMotionEnabled) {
      reveal.setValue(1);
      glowPulse.setValue(0);
      return;
    }

    reveal.setValue(0);
    const settle = Animated.timing(reveal, {
      duration: motion.durationMs.ritual,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    settle.start();
    glow.start();

    return () => {
      settle.stop();
      glow.stop();
    };
  }, [glowPulse, reduceMotionEnabled, reveal]);

  useEffect(() => {
    if (!isGlobeFullscreen) {
      fullscreenSettle.setValue(0);
      return;
    }

    if (reduceMotionEnabled) {
      fullscreenSettle.setValue(1);
      return;
    }

    fullscreenSettle.setValue(0);
    const settle = Animated.timing(fullscreenSettle, {
      duration: motion.durationMs.ritual,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    settle.start();

    return () => {
      settle.stop();
    };
  }, [fullscreenSettle, isGlobeFullscreen, reduceMotionEnabled]);

  useEffect(() => {
    if (!isGlobeFullscreen) {
      previewSettle.setValue(0);
      return;
    }

    if (!fullscreenSelection) {
      previewSettle.setValue(0);
      return;
    }

    if (reduceMotionEnabled) {
      previewSettle.setValue(1);
      return;
    }

    previewSettle.setValue(0);
    const animation = Animated.timing(previewSettle, {
      duration: motion.durationMs.slow,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [fullscreenSelection, isGlobeFullscreen, previewSettle, reduceMotionEnabled]);

  useEffect(() => {
    if (!mapboxRuntimeReady || reduceMotionEnabled) {
      return;
    }

    const pulseInterval = setInterval(() => {
      setPulseTick((current) => (current + 1) % RIPPLE_FRAME_COUNT);
    }, 150);

    return () => {
      clearInterval(pulseInterval);
    };
  }, [mapboxRuntimeReady, reduceMotionEnabled]);

  useEffect(() => {
    return () => {
      if (interactionIdleTimerRef.current) {
        clearTimeout(interactionIdleTimerRef.current);
        interactionIdleTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapboxRuntimeReady || !isGlobeMapLoaded || isGlobeInteracting) {
      return;
    }

    const camera = globeCameraRef.current;
    if (!camera?.setCamera) {
      return;
    }

    programmaticCameraUntilRef.current = Date.now() + GLOBE_RESET_ANIMATION_MS + 200;
    globeLongitudeRef.current = 0;
    camera.setCamera({
      animationDuration: GLOBE_RESET_ANIMATION_MS,
      animationMode: 'linearTo',
      centerCoordinate: [globeLongitudeRef.current, 0],
      heading: 0,
      pitch: 0,
      zoomLevel: GLOBE_CAMERA_ZOOM_LEVEL,
    });
  }, [isGlobeInteracting, isGlobeMapLoaded, mapboxRuntimeReady]);

  useEffect(() => {
    if (!mapboxRuntimeReady || !isGlobeMapLoaded || isGlobeInteracting || reduceMotionEnabled) {
      return;
    }

    let lastTimestamp = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = Math.max(0, now - lastTimestamp);
      lastTimestamp = now;

      const elapsedSeconds = deltaMs / 1000;
      const nextLongitude =
        globeLongitudeRef.current - elapsedSeconds * GLOBE_AUTO_ROTATE_DEGREES_PER_SECOND;
      globeLongitudeRef.current = nextLongitude;

      const liveCamera = globeCameraRef.current;
      if (!liveCamera?.setCamera) {
        return;
      }

      programmaticCameraUntilRef.current = Date.now() + GLOBE_PROGRAMMATIC_CAMERA_GUARD_MS;
      liveCamera.setCamera({
        animationDuration: GLOBE_AUTO_ROTATE_ANIMATION_MS,
        animationMode: 'linearTo',
        centerCoordinate: [nextLongitude, 0],
        heading: 0,
        pitch: 0,
        zoomLevel: GLOBE_CAMERA_ZOOM_LEVEL,
      });
    }, GLOBE_AUTO_ROTATE_TICK_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isGlobeInteracting, isGlobeMapLoaded, mapboxRuntimeReady, reduceMotionEnabled]);

  const pulsePhasePrimary = useMemo(
    () => (pulseTick % RIPPLE_FRAME_COUNT) / RIPPLE_FRAME_COUNT,
    [pulseTick],
  );
  const pulsePhaseSecondary = useMemo(() => (pulsePhasePrimary + 0.5) % 1, [pulsePhasePrimary]);

  const ringLayerStyle = useCallback(
    (
      color: string,
      baseRadius: number,
      phase: number,
      intensity = 1,
      selectedPointId?: string | null,
    ) => {
      const ripple = reduceMotionEnabled ? 0.2 : easeOutCubic(phase);
      const resolvedRadius = baseRadius + ripple * (12 * intensity);
      const resolvedOpacity = Math.max(0.06, (1 - ripple) * 0.56 * intensity);
      const resolvedStrokeWidth = Math.max(0.9, 2.4 - ripple * 1.5);
      const selectedBoost = 2.2;
      const selectedOpacityBoost = 0.2;
      const selectedStrokeBoost = 0.8;
      const stateRadiusBoostExpression = [
        'match',
        ['get', 'pulse_state'],
        'live',
        1.35,
        'waiting_room',
        1.05,
        'ritual_1111',
        2.1,
        'flagship',
        2.35,
        'news',
        0.7,
        'upcoming',
        0.35,
        0.3,
      ];
      const stateStrokeBoostExpression = [
        'match',
        ['get', 'pulse_state'],
        'live',
        0.3,
        'waiting_room',
        0.22,
        'ritual_1111',
        0.55,
        'flagship',
        0.65,
        'news',
        0.2,
        'upcoming',
        0.08,
        0.06,
      ];
      const scaledRadiusExpression = [
        '+',
        ['*', resolvedRadius, ['coalesce', ['get', 'marker_scale'], 1]],
        stateRadiusBoostExpression,
      ];
      const intensityOpacityExpression = [
        '+',
        resolvedOpacity,
        [
          'match',
          ['get', 'intensity_bucket'],
          'radiant',
          0.22,
          'vivid',
          0.12,
          'steady',
          0.06,
          0,
        ],
      ];
      const scaledStrokeExpression = [
        '+',
        resolvedStrokeWidth,
        ['*', ['coalesce', ['get', 'presence_bucket'], 0], 0.16],
        stateStrokeBoostExpression,
      ];
      return {
        circleBlur: 0.08 + ripple * 0.32,
        circleColor: 'rgba(0,0,0,0)',
        circleRadius: selectedPointId
          ? [
              'case',
              ['==', ['get', 'id'], selectedPointId],
              ['+', scaledRadiusExpression, selectedBoost],
              scaledRadiusExpression,
            ]
          : scaledRadiusExpression,
        circleStrokeColor: color,
        circleStrokeOpacity: selectedPointId
          ? [
              'case',
              ['==', ['get', 'id'], selectedPointId],
              ['min', 1, ['+', intensityOpacityExpression, selectedOpacityBoost]],
              ['min', 1, intensityOpacityExpression],
            ]
          : ['min', 1, intensityOpacityExpression],
        circleStrokeWidth: selectedPointId
          ? [
              'case',
              ['==', ['get', 'id'], selectedPointId],
              ['+', scaledStrokeExpression, selectedStrokeBoost],
              scaledStrokeExpression,
            ]
          : scaledStrokeExpression,
      };
    },
    [reduceMotionEnabled],
  );

  const coreLayerStyle = useCallback(
    (color: string, radius: number, selectedPointId?: string | null) => {
      const selectedRadius = radius + 1.8;
      const selectedStrokeWidth = 1.8;
      const baseStroke = eventsSurface.globe.frameBorder;
      const selectedStroke = eventsSurface.globeFullscreen.selectedStroke;
      const stateRadiusBoostExpression = [
        'match',
        ['get', 'pulse_state'],
        'live',
        0.82,
        'waiting_room',
        0.5,
        'ritual_1111',
        1.15,
        'flagship',
        1.3,
        'news',
        0.3,
        'upcoming',
        0,
        0,
      ];
      const stateStrokeExpression = [
        'match',
        ['get', 'pulse_state'],
        'flagship',
        eventsSurface.hero.accent,
        'ritual_1111',
        sectionVisualThemes.live.surface.edge,
        'waiting_room',
        eventsSurface.occurrence.soonChipText,
        baseStroke,
      ];
      const scaledRadiusExpression = [
        '+',
        ['*', radius, ['coalesce', ['get', 'marker_scale'], 1]],
        stateRadiusBoostExpression,
      ];
      const selectedScaledRadiusExpression = [
        '+',
        ['*', selectedRadius, ['coalesce', ['get', 'marker_scale'], 1]],
        stateRadiusBoostExpression,
      ];
      const baseOpacityExpression = [
        '+',
        0.86,
        [
          'match',
          ['get', 'intensity_bucket'],
          'radiant',
          0.1,
          'vivid',
          0.06,
          'steady',
          0.03,
          0,
        ],
      ];

      return {
        circleColor: color,
        circleOpacity: selectedPointId
          ? ['case', ['==', ['get', 'id'], selectedPointId], 1, ['min', 1, baseOpacityExpression]]
          : ['min', 1, baseOpacityExpression],
        circleRadius: selectedPointId
          ? ['case', ['==', ['get', 'id'], selectedPointId], selectedScaledRadiusExpression, scaledRadiusExpression]
          : scaledRadiusExpression,
        circleStrokeColor: selectedPointId
          ? ['case', ['==', ['get', 'id'], selectedPointId], selectedStroke, stateStrokeExpression]
          : stateStrokeExpression,
        circleStrokeWidth: selectedPointId
          ? ['case', ['==', ['get', 'id'], selectedPointId], selectedStrokeWidth, 1]
          : 1,
      };
    },
    [],
  );

  const mapFallbackReason = useMemo(() => {
    if (!clientEnv.mapboxToken) {
      return 'Global Pulse markers remain available in list mode while map rendering is unavailable.';
    }

    if (!mapboxReady) {
      return 'Interactive globe mode is unavailable on this runtime, but live rooms remain fully available.';
    }

    if (!hasConfiguredMapboxToken) {
      return 'Initializing secure globe renderer.';
    }

    return '';
  }, [hasConfiguredMapboxToken, mapboxReady]);

  const mapFallbackDetail = useMemo(() => {
    if (!__DEV__) {
      return null;
    }

    if (!clientEnv.mapboxToken) {
      return 'Developer note: set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable map rendering.';
    }

    if (!mapboxReady) {
      return 'Developer note: @rnmapbox/maps requires a native development build. Expo Go fallback is active.';
    }

    return null;
  }, [mapboxReady]);

  const markGlobeInteraction = useCallback(() => {
    if (!mapboxRuntimeReady) {
      return;
    }

    setIsGlobeInteracting(true);

    if (interactionIdleTimerRef.current) {
      clearTimeout(interactionIdleTimerRef.current);
    }

    interactionIdleTimerRef.current = setTimeout(() => {
      setIsGlobeInteracting(false);
      interactionIdleTimerRef.current = null;
    }, GLOBE_INTERACTION_IDLE_MS);
  }, [mapboxRuntimeReady]);

  const onMapCameraChanged = useCallback(
    (event: unknown) => {
      if (Date.now() < programmaticCameraUntilRef.current) {
        return;
      }

      const cameraEvent = event as {
        gestures?: {
          isGestureActive?: boolean;
        };
      };

      if (cameraEvent?.gestures?.isGestureActive) {
        markGlobeInteraction();
      }
    },
    [markGlobeInteraction],
  );

  const onMapPointPress = useCallback(
    (pressEvent: unknown) => {
      lastShapeSourcePressAtRef.current = Date.now();
      markGlobeInteraction();
      const pointId = extractPressedMapFeatureId(pressEvent);
      if (!pointId) {
        return;
      }

      const occurrence = mapOccurrenceByPointId.get(pointId);
      if (occurrence) {
        if (isGlobeFullscreen) {
          setFullscreenSelection({
            event: null,
            occurrence,
            pointId,
            sourceType: 'occurrence',
          });
          return;
        }
        onOpenOccurrence(occurrence);
        return;
      }

      const event = mapEventByPointId.get(pointId);
      if (!event) {
        return;
      }

      if (isGlobeFullscreen) {
        setFullscreenSelection({
          event,
          occurrence: null,
          pointId,
          sourceType: 'event',
        });
        return;
      }

      onOpenEventRoom(event);
    },
    [
      isGlobeFullscreen,
      mapEventByPointId,
      mapOccurrenceByPointId,
      markGlobeInteraction,
      onOpenEventRoom,
      onOpenOccurrence,
    ],
  );

  const openGlobeFullscreen = useCallback(() => {
    setIsGlobeMapLoaded(false);
    setFullscreenSelection(null);
    setIsGlobeFullscreen(true);
  }, []);

  const closeGlobeFullscreen = useCallback(() => {
    setIsGlobeMapLoaded(false);
    setFullscreenSelection(null);
    setIsGlobeFullscreen(false);
  }, []);

  const handleInlineMapPress = useCallback(
    (pressEvent: unknown) => {
      markGlobeInteraction();

      const now = Date.now();
      if (now - lastShapeSourcePressAtRef.current < GLOBE_FULLSCREEN_FEATURE_TAP_GUARD_MS) {
        return;
      }

      const featureId = extractPressedMapFeatureId(pressEvent);
      if (featureId) {
        return;
      }

      openGlobeFullscreen();
    },
    [markGlobeInteraction, openGlobeFullscreen],
  );

  const handleFullscreenMapPress = useCallback(
    (pressEvent: unknown) => {
      markGlobeInteraction();

      const now = Date.now();
      if (now - lastShapeSourcePressAtRef.current < GLOBE_FULLSCREEN_FEATURE_TAP_GUARD_MS) {
        return;
      }

      const featureId = extractPressedMapFeatureId(pressEvent);
      if (featureId) {
        return;
      }

      setFullscreenSelection(null);
    },
    [markGlobeInteraction],
  );

  const renderGlobeView = useCallback(
    (mode: 'inline' | 'fullscreen') => {
      const isFullscreenMode = mode === 'fullscreen';
      const frameStyle = isFullscreenMode ? styles.globeMapFrameFullscreen : styles.globeMapFrame;
      const maskStyle = isFullscreenMode ? styles.globeMapMaskFullscreen : styles.globeMapMask;
      const mapStyle = isFullscreenMode ? styles.globeMapFullscreen : styles.globeMap;
      const selectedPointId = isFullscreenMode ? (fullscreenSelection?.pointId ?? null) : null;
      const fallbackWrapStyle = isFullscreenMode
        ? styles.globeFallbackWrapFullscreen
        : styles.globeFallbackWrap;

      if (mapboxRuntimeReady) {
        return (
          <View style={frameStyle}>
            <View style={maskStyle}>
              <MapboxMapViewComponent
                attributionEnabled={false}
                compassEnabled={false}
                localizeLabels={false}
                logoEnabled={false}
                onCameraChanged={onMapCameraChanged}
                onDidFinishLoadingMap={() => {
                  setIsGlobeMapLoaded(true);
                }}
                onPress={isFullscreenMode ? handleFullscreenMapPress : handleInlineMapPress}
                onTouchStart={markGlobeInteraction}
                pitchEnabled={false}
                projection="globe"
                rotateEnabled
                scaleBarEnabled={false}
                scrollEnabled
                style={mapStyle}
                styleJSON={TRANSPARENT_GLOBE_STYLE_JSON}
                surfaceView={false}
                zoomEnabled
              >
                <MapboxCameraComponent
                  ref={globeCameraRef}
                  defaultSettings={{
                    centerCoordinate: GLOBE_CAMERA_CENTER,
                    heading: 0,
                    pitch: 0,
                    zoomLevel: GLOBE_CAMERA_ZOOM_LEVEL,
                  }}
                />

                {liveRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-live-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={liveRingGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-live-ring-${mode}`}
                      style={ringLayerStyle(
                        eventMapColors.live,
                        8.5,
                        pulsePhasePrimary,
                        1,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-live-ring-secondary-${mode}`}
                      style={ringLayerStyle(
                        eventMapColors.live,
                        8.5,
                        pulsePhaseSecondary,
                        0.8,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-live-core-${mode}`}
                      style={coreLayerStyle(eventMapColors.live, 3.8, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {waitingRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-waiting-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={waitingRingGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-waiting-ring-${mode}`}
                      style={ringLayerStyle(
                        eventsSurface.occurrence.soonChipText,
                        7.8,
                        pulsePhasePrimary,
                        1.12,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-waiting-ring-secondary-${mode}`}
                      style={ringLayerStyle(
                        eventsSurface.occurrence.soonChipText,
                        7.8,
                        pulsePhaseSecondary,
                        0.9,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-waiting-core-${mode}`}
                      style={coreLayerStyle(eventsSurface.occurrence.soonChipText, 3.6, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {upcomingRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-upcoming-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={upcomingRingGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-upcoming-ring-${mode}`}
                      style={ringLayerStyle(
                        eventMapColors.scheduled,
                        7.2,
                        pulsePhasePrimary,
                        0.82,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-upcoming-core-${mode}`}
                      style={coreLayerStyle(eventMapColors.scheduled, 3.1, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {newsRingGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-news-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={newsRingGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-news-ring-${mode}`}
                      style={ringLayerStyle(
                        eventMapColors.news,
                        8.2,
                        pulsePhasePrimary,
                        0.94,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-news-core-${mode}`}
                      style={coreLayerStyle(eventMapColors.news, 3.25, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {flagshipAccentGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-flagship-accent-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={flagshipAccentGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-flagship-accent-ring-${mode}`}
                      style={ringLayerStyle(
                        eventsSurface.hero.accent,
                        9.6,
                        pulsePhasePrimary,
                        1.3,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-flagship-accent-core-${mode}`}
                      style={coreLayerStyle(eventsSurface.hero.accent, 4.3, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {ritualAccentGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    hitbox={MAP_TAP_HITBOX}
                    id={`events-ritual-accent-source-${mode}`}
                    onPress={onMapPointPress}
                    shape={ritualAccentGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-ritual-accent-ring-${mode}`}
                      style={ringLayerStyle(
                        sectionVisualThemes.live.surface.edge,
                        8.8,
                        pulsePhaseSecondary,
                        1.06,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-ritual-accent-core-${mode}`}
                      style={coreLayerStyle(sectionVisualThemes.live.surface.edge, 4.0, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}

                {userGeoJson.features.length > 0 ? (
                  <MapboxShapeSourceComponent
                    id={`events-online-users-source-${mode}`}
                    shape={userGeoJson}
                  >
                    <MapboxCircleLayerComponent
                      id={`events-online-users-ring-${mode}`}
                      style={ringLayerStyle(
                        eventMapColors.user,
                        6.4,
                        pulsePhaseSecondary,
                        0.52,
                        selectedPointId,
                      )}
                    />
                    <MapboxCircleLayerComponent
                      id={`events-online-users-core-${mode}`}
                      style={coreLayerStyle(eventMapColors.user, 2.7, selectedPointId)}
                    />
                  </MapboxShapeSourceComponent>
                ) : null}
              </MapboxMapViewComponent>
            </View>
          </View>
        );
      }

      return (
        <Pressable
          accessibilityHint="Opens the fullscreen globe view."
          accessibilityLabel="Open fullscreen globe"
          accessibilityRole="button"
          accessibilityState={{ disabled: isFullscreenMode }}
          disabled={isFullscreenMode}
          onPress={openGlobeFullscreen}
          style={fallbackWrapStyle}
        >
          <View style={styles.globeFallbackPanel}>
            <View style={styles.globeFallbackBadge}>
              <MaterialCommunityIcons
                color={eventsSurface.globe.legendText}
                name="earth"
                size={14}
              />
              <Typography
                allowFontScaling={false}
                color={eventsSurface.globe.legendText}
                style={styles.globeFallbackBadgeText}
                variant="Caption"
                weight="bold"
              >
                Globe fallback
              </Typography>
            </View>
            <LottieView
              autoPlay
              loop
              source={globeFallbackAnimation}
              style={styles.globeAnimation}
            />
            <Typography
              allowFontScaling={false}
              style={styles.globeFallbackTitle}
              variant="Body"
              weight="bold"
            >
              Global map preview unavailable
            </Typography>
            <Typography
              allowFontScaling={false}
              color={colors.textSecondary}
              style={styles.mapFallbackText}
              variant="Caption"
            >
              {mapFallbackReason}
            </Typography>
            {mapFallbackDetail ? (
              <Typography
                allowFontScaling={false}
                color={eventsSurface.occurrence.itemMeta}
                style={styles.globeFallbackDetail}
                variant="Caption"
              >
                {mapFallbackDetail}
              </Typography>
            ) : null}
            {!isFullscreenMode ? (
              <View style={styles.globeFallbackHintRow}>
                <MaterialCommunityIcons
                  color={eventsSurface.occurrence.ctaText}
                  name="arrow-expand-all"
                  size={14}
                />
                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.occurrence.ctaText}
                  variant="Caption"
                  weight="bold"
                >
                  Open immersive view
                </Typography>
              </View>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [
      MapboxCameraComponent,
      MapboxCircleLayerComponent,
      MapboxMapViewComponent,
      MapboxShapeSourceComponent,
      coreLayerStyle,
      fullscreenSelection,
      handleFullscreenMapPress,
      handleInlineMapPress,
      flagshipAccentGeoJson,
      liveRingGeoJson,
      mapFallbackDetail,
      mapFallbackReason,
      mapboxReady,
      mapboxRuntimeReady,
      markGlobeInteraction,
      newsRingGeoJson,
      onMapCameraChanged,
      onMapPointPress,
      openGlobeFullscreen,
      pulsePhasePrimary,
      pulsePhaseSecondary,
      ringLayerStyle,
      ritualAccentGeoJson,
      upcomingRingGeoJson,
      userGeoJson,
      waitingRingGeoJson,
    ],
  );

  const revealStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: reveal.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
        transform: [
          {
            translateY: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      };

  const glowStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: glowPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 0.48],
        }),
        transform: [
          {
            scale: glowPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  const fullscreenOverlayStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: fullscreenSettle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.86, 1],
        }),
        transform: [
          {
            translateY: fullscreenSettle.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      };

  const previewRevealStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: previewSettle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.86, 1],
        }),
        transform: [
          {
            translateY: previewSettle.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      };

  const fullscreenSelectionStatus = useMemo(() => {
    if (!fullscreenSelection) {
      return null;
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      return fullscreenSelection.occurrence?.status ?? null;
    }

    const selectedEvent = fullscreenSelection.event;
    if (!selectedEvent) {
      return null;
    }

    return (
      toOccurrenceStatus(selectedEvent.startsAt, selectedEvent.durationMinutes, nowTick) ??
      'upcoming'
    );
  }, [fullscreenSelection, nowTick]);

  const fullscreenSelectionTitle = useMemo(() => {
    if (!fullscreenSelection) {
      return '';
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      return fullscreenSelection.occurrence?.title ?? '';
    }

    return fullscreenSelection.event?.title ?? '';
  }, [fullscreenSelection]);

  const fullscreenSelectionBody = useMemo(() => {
    if (!fullscreenSelection) {
      return '';
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      return fullscreenSelection.occurrence?.body ?? '';
    }

    return fullscreenSelection.event?.description?.trim() || 'Join this collective intention room.';
  }, [fullscreenSelection]);

  const fullscreenSelectionStartLabel = useMemo(() => {
    if (!fullscreenSelection) {
      return '';
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      const startsAt = fullscreenSelection.occurrence?.startsAt;
      return startsAt ? formatOccurrenceStartLabel(startsAt) : 'Upcoming';
    }

    const startsAt = fullscreenSelection.event?.startsAt;
    return startsAt ? formatOccurrenceStartLabel(startsAt) : 'Upcoming';
  }, [fullscreenSelection]);

  const fullscreenSelectionMeta = useMemo(() => {
    if (!fullscreenSelection) {
      return '';
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      const occurrence = fullscreenSelection.occurrence;
      if (!occurrence) {
        return '';
      }

      return `${occurrence.durationMinutes} min - ${occurrence.category}`;
    }

    const selectedEvent = fullscreenSelection.event;
    if (!selectedEvent) {
      return '';
    }

    return `${selectedEvent.durationMinutes} min - ${selectedEvent.region?.trim() || selectedEvent.countryCode?.trim() || 'Global'}`;
  }, [fullscreenSelection]);
  const fullscreenSelectionInsight = useMemo(() => {
    if (!fullscreenSelection || fullscreenSelection.sourceType !== 'occurrence') {
      return null;
    }

    return pointInsightByPointId.get(fullscreenSelection.pointId) ?? null;
  }, [fullscreenSelection, pointInsightByPointId]);
  const fullscreenSelectionPulseLabel = fullscreenSelectionInsight
    ? `${fullscreenSelectionInsight.intensityLabel} pulse`
    : null;
  const fullscreenSelectionAccentLabel = fullscreenSelectionInsight
    ? fullscreenSelectionInsight.isRitual1111
      ? '11:11'
      : fullscreenSelectionInsight.isFlagship
        ? 'Flagship'
        : fullscreenSelectionInsight.canonicalState === 'waiting_room'
          ? 'Opening soon'
          : fullscreenSelectionInsight.canonicalState === 'live'
            ? 'Live now'
            : 'Upcoming'
    : null;

  const canOpenFullscreenDetails = useMemo(() => {
    if (!fullscreenSelection) {
      return false;
    }

    if (fullscreenSelection.sourceType === 'occurrence') {
      return Boolean(fullscreenSelection.occurrence);
    }

    return Boolean(fullscreenSelection.event?.id);
  }, [fullscreenSelection]);

  const onOpenFullscreenSelectionRoom = useCallback(() => {
    if (!fullscreenSelection) {
      return;
    }

    if (fullscreenSelection.sourceType === 'occurrence' && fullscreenSelection.occurrence) {
      closeGlobeFullscreen();
      onOpenOccurrence(fullscreenSelection.occurrence);
      return;
    }

    if (fullscreenSelection.event) {
      closeGlobeFullscreen();
      onOpenEventRoom(fullscreenSelection.event);
    }
  }, [closeGlobeFullscreen, fullscreenSelection, onOpenEventRoom, onOpenOccurrence]);

  const onOpenFullscreenSelectionDetails = useCallback(() => {
    if (!fullscreenSelection) {
      return;
    }

    if (fullscreenSelection.sourceType === 'occurrence' && fullscreenSelection.occurrence) {
      closeGlobeFullscreen();
      onOpenOccurrenceDetails(fullscreenSelection.occurrence);
      return;
    }

    if (fullscreenSelection.event) {
      closeGlobeFullscreen();
      onOpenEventDetails(fullscreenSelection.event);
    }
  }, [closeGlobeFullscreen, fullscreenSelection, onOpenEventDetails, onOpenOccurrenceDetails]);
  const onOpenSpotlightOccurrence = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      closeGlobeFullscreen();
      onOpenOccurrence(occurrence);
    },
    [closeGlobeFullscreen, onOpenOccurrence],
  );

  const fullscreenPrimaryActionLabel =
    fullscreenSelectionStatus === 'live'
      ? 'Join live room'
      : fullscreenSelectionStatus === 'waiting_room' || fullscreenSelectionStatus === 'soon'
        ? 'Enter waiting room'
        : 'Open moment';

  return (
    <>
      <Animated.View style={revealStyle}>
        <View style={[styles.section, styles.globePanel]}>
          <View style={styles.globeHeroHeader}>
            <View style={styles.globeHeroTitleWrap}>
              <View style={styles.globeLiveBadge}>
                <LiveLogo context="events" size={20} />
                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.hero.accent}
                  style={styles.globeLiveBadgeText}
                  variant="Caption"
                  weight="bold"
                >
                  Global Pulse
                </Typography>
              </View>
              <Typography
                allowFontScaling={false}
                color={colors.textPrimary}
                style={styles.globeHeroTitle}
                variant="H2"
                weight="bold"
              >
                See shared rooms across the world
              </Typography>
              <Typography
                allowFontScaling={false}
                color={eventsSurface.hero.subtitle}
                style={styles.globeHeroSubtitle}
                variant="Caption"
              >
                Room pulses mirror real shared activity. Brighter, larger lights signal stronger collective momentum, and clusters are approximate.
              </Typography>
            </View>
            <Pressable
              accessibilityLabel="Open fullscreen globe"
              accessibilityHint="Opens an immersive full-screen globe view."
              accessibilityRole="button"
              onPress={openGlobeFullscreen}
              style={({ pressed }) => [
                styles.fullscreenTriggerHeader,
                !reduceMotionEnabled && pressed ? styles.fullscreenTriggerPressed : null,
              ]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="fullscreen" size={18} />
            </Pressable>
          </View>

          <View style={styles.globeMetaRow}>
            {globeSummaryChips.map((chip) => (
              <View
                key={chip.key}
                style={[
                  styles.metaPill,
                  chip.value === 0 ? styles.metaPillMuted : null,
                ]}
              >
                <Typography
                  allowFontScaling={false}
                  color={chip.value === 0 ? eventsSurface.occurrence.itemMeta : eventsSurface.globe.legendText}
                  variant="Caption"
                  weight="bold"
                >
                  {chip.value > 0 ? `${chip.value} ${chip.label}` : chip.label}
                </Typography>
              </View>
            ))}
          </View>

          <View style={styles.globeWrap}>
            <Animated.View pointerEvents="none" style={[styles.glowSpot, glowStyle]} />
            {!isGlobeFullscreen ? renderGlobeView('inline') : null}
            <Pressable
              accessibilityLabel="Open fullscreen globe"
              accessibilityHint="Opens an immersive full-screen globe view."
              accessibilityRole="button"
              onPress={openGlobeFullscreen}
              style={({ pressed }) => [
                styles.fullscreenTrigger,
                !reduceMotionEnabled && pressed ? styles.fullscreenTriggerPressed : null,
              ]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="fullscreen" size={18} />
            </Pressable>
          </View>

          <View style={styles.legendRow}>
            <LegendChip color={eventMapColors.live} label="Live now" />
            <LegendChip color={eventsSurface.occurrence.soonChipText} label="Opening soon" />
            <LegendChip color={eventsSurface.hero.accent} label="Flagship" />
            <LegendChip color={sectionVisualThemes.live.surface.edge} label="11:11" />
            <LegendChip color={eventMapColors.scheduled} label="Upcoming moments" />
            <LegendChip color={eventMapColors.news} label="News pulse" />
            <LegendChip color={eventMapColors.user} label="Active clusters" />
          </View>

          <Typography
            allowFontScaling={false}
            color={eventsSurface.occurrence.itemMeta}
            style={styles.globePrivacyNote}
            variant="Caption"
          >
            Clusters represent room-level rhythm by region and timezone, not precise participant geolocation.
          </Typography>

          {loading && events.length === 0 ? (
            <LoadingStateCard
              compact
              subtitle="Synchronizing live hotspots and event activity."
              title="Loading event stream"
            />
          ) : null}

          {error ? (
            <InlineErrorCard
              message={error}
              style={styles.feedCard}
              title="Could not load event stream"
            />
          ) : null}

          {newsSyncError ? (
            <InlineErrorCard
              message={newsSyncError}
              style={styles.feedCard}
              title="News-driven events unavailable"
              tone="warning"
            />
          ) : null}

          {visibleEvents.map((event) => (
            <View key={event.id} style={styles.feedRibbon}>
              <Typography
                allowFontScaling={false}
                style={styles.feedRibbonTitle}
                variant="H2"
                weight="bold"
              >
                {event.title}
              </Typography>
              <Typography
                allowFontScaling={false}
                color={eventsSurface.occurrence.itemMeta}
                variant="Caption"
              >
                {formatEventSubtitle(event)}
              </Typography>
            </View>
          ))}
        </View>
      </Animated.View>

      <Modal
        animationType="fade"
        onRequestClose={closeGlobeFullscreen}
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={isGlobeFullscreen}
      >
        <View style={styles.fullscreenRoot}>
          <LinearGradient
            colors={[
              eventsSurface.globeFullscreen.backdropFrom,
              eventsSurface.globeFullscreen.backdropTo,
            ]}
            end={{ x: 0.5, y: 1 }}
            start={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.fullscreenGlobeWrap}>{renderGlobeView('fullscreen')}</View>

          <LinearGradient
            colors={[
              eventsSurface.globeFullscreen.edgeScrimFrom,
              eventsSurface.globeFullscreen.edgeScrimTo,
            ]}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={styles.fullscreenTopScrim}
          />

          <Animated.View style={[styles.fullscreenHeader, fullscreenOverlayStyle]}>
            <View style={styles.fullscreenTopBar}>
              <Pressable
                accessibilityLabel="Close fullscreen globe"
                accessibilityHint="Returns to the embedded globe."
                accessibilityRole="button"
                onPress={closeGlobeFullscreen}
                style={({ pressed }) => [
                  styles.fullscreenCloseButton,
                  !reduceMotionEnabled && pressed ? styles.fullscreenTriggerPressed : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={eventsSurface.globeFullscreen.closeButtonIcon}
                  name="arrow-left"
                  size={18}
                />
                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.globeFullscreen.closeButtonText}
                  style={styles.fullscreenCloseLabel}
                  variant="Caption"
                  weight="bold"
                >
                  Back
                </Typography>
              </Pressable>

              <View style={styles.fullscreenTitleWrap}>
                <Typography
                  allowFontScaling={false}
                  style={styles.fullscreenTitle}
                  variant="H2"
                  weight="bold"
                >
                  Global Pulse Globe
                </Typography>
                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.globeFullscreen.legendText}
                  variant="Caption"
                >
                  Tap a pulse to preview and open the live room or moment.
                </Typography>
              </View>
            </View>
          </Animated.View>

          {fullscreenSelection ? (
            <Animated.View style={[styles.selectionPreview, previewRevealStyle]}>
              <View style={styles.selectionPreviewCard}>
                <View style={styles.selectionHeader}>
                  <View style={styles.selectionStateRow}>
                    <View
                      style={[
                        styles.selectionStatusChip,
                        fullscreenSelectionStatus === 'live'
                          ? styles.selectionStatusLive
                          : fullscreenSelectionStatus === 'soon' ||
                              fullscreenSelectionStatus === 'waiting_room'
                            ? styles.selectionStatusSoon
                            : styles.selectionStatusUpcoming,
                      ]}
                    >
                      <Typography
                        allowFontScaling={false}
                        style={[
                          styles.selectionStatusText,
                          fullscreenSelectionStatus === 'live'
                            ? styles.selectionStatusLiveText
                            : fullscreenSelectionStatus === 'soon' ||
                                fullscreenSelectionStatus === 'waiting_room'
                              ? styles.selectionStatusSoonText
                              : styles.selectionStatusUpcomingText,
                        ]}
                        variant="Caption"
                        weight="bold"
                      >
                        {statusLabel(fullscreenSelectionStatus ?? 'upcoming')}
                      </Typography>
                    </View>
                    {fullscreenSelectionAccentLabel ? (
                      <View style={styles.selectionAccentChip}>
                        <Typography
                          allowFontScaling={false}
                          color={eventsSurface.globeFullscreen.legendText}
                          variant="Caption"
                          weight="bold"
                        >
                          {fullscreenSelectionAccentLabel}
                        </Typography>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Typography
                  allowFontScaling={false}
                  style={styles.selectionTitle}
                  variant="H2"
                  weight="bold"
                >
                  {fullscreenSelectionTitle}
                </Typography>

                <View style={styles.selectionMetaStack}>
                  <Typography
                    allowFontScaling={false}
                    color={eventsSurface.globeFullscreen.previewMeta}
                    variant="Caption"
                    weight="bold"
                  >
                    {fullscreenSelectionStartLabel}
                  </Typography>
                  <Typography
                    allowFontScaling={false}
                    color={eventsSurface.globeFullscreen.previewMeta}
                    variant="Caption"
                  >
                    {fullscreenSelectionMeta}
                  </Typography>
                  {fullscreenSelectionPulseLabel ? (
                    <Typography
                      allowFontScaling={false}
                      color={eventsSurface.globeFullscreen.previewMeta}
                      variant="Caption"
                    >
                      {fullscreenSelectionPulseLabel}
                    </Typography>
                  ) : null}
                </View>

                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.globeFullscreen.previewBody}
                  numberOfLines={3}
                >
                  {fullscreenSelectionBody}
                </Typography>

                <View style={styles.selectionActions}>
                  <Button
                    onPress={onOpenFullscreenSelectionRoom}
                    title={fullscreenPrimaryActionLabel}
                    variant="gold"
                  />
                  {canOpenFullscreenDetails ? (
                    <Button
                      onPress={onOpenFullscreenSelectionDetails}
                      title="Open details"
                      variant="secondary"
                    />
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ) : null}

          {!fullscreenSelection && spotlightMoments.length > 0 ? (
            <Animated.View style={[styles.fullscreenSpotlightWrap, previewRevealStyle]}>
              <View style={styles.fullscreenSpotlightCard}>
                <Typography
                  allowFontScaling={false}
                  color={eventsSurface.globeFullscreen.previewTitle}
                  variant="Caption"
                  weight="bold"
                >
                  Join from the field
                </Typography>
                {spotlightMoments.map((occurrence) => (
                  <Pressable
                    accessibilityHint="Opens this highlighted live moment."
                    accessibilityLabel={`Open ${occurrence.title}`}
                    accessibilityRole="button"
                    key={`spotlight-${occurrence.occurrenceKey}`}
                    onPress={() => onOpenSpotlightOccurrence(occurrence)}
                    style={({ pressed }) => [
                      styles.fullscreenSpotlightRow,
                      !reduceMotionEnabled && pressed ? styles.fullscreenTriggerPressed : null,
                    ]}
                  >
                    <View style={styles.fullscreenSpotlightCopy}>
                      <Typography
                        allowFontScaling={false}
                        style={styles.fullscreenSpotlightTitle}
                        variant="Body"
                        weight="bold"
                      >
                        {occurrence.title}
                      </Typography>
                      <Typography
                        allowFontScaling={false}
                        color={eventsSurface.globeFullscreen.previewMeta}
                        variant="Caption"
                      >
                        {`${statusLabel(occurrence.status)} | ${formatOccurrenceStartLabel(occurrence.startsAt)}`}
                      </Typography>
                    </View>
                    <MaterialCommunityIcons
                      color={eventsSurface.globeFullscreen.previewMeta}
                      name="arrow-top-right"
                      size={17}
                    />
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  feedRibbon: {
    backgroundColor: eventsSurface.globe.ribbonBackground,
    borderColor: eventsSurface.globe.ribbonBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 3,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  feedRibbonTitle: {
    lineHeight: 22,
  },
  fullscreenCloseButton: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globeFullscreen.closeButtonBackground,
    borderColor: eventsSurface.globeFullscreen.closeButtonBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    height: 38,
    justifyContent: 'center',
    minWidth: 84,
    paddingHorizontal: spacing.sm,
  },
  fullscreenCloseLabel: {
    textTransform: 'none',
  },
  fullscreenGlobeWrap: {
    flex: 1,
    width: '100%',
  },
  fullscreenHeader: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    right: 0,
    top: spacing.lg,
    width: '100%',
  },
  fullscreenRoot: {
    flex: 1,
    position: 'relative',
  },
  fullscreenSpotlightCard: {
    backgroundColor: eventsSurface.globeFullscreen.previewBackground,
    borderColor: eventsSurface.globeFullscreen.previewBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fullscreenSpotlightCopy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.xs,
  },
  fullscreenSpotlightRow: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  fullscreenSpotlightTitle: {
    color: eventsSurface.globeFullscreen.previewTitle,
  },
  fullscreenSpotlightWrap: {
    bottom: spacing.md,
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
  },
  fullscreenTitle: {
    lineHeight: 24,
  },
  fullscreenTitleWrap: {
    flex: 1,
    gap: 1,
  },
  fullscreenTopBar: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globeFullscreen.topBarBackground,
    borderColor: eventsSurface.globeFullscreen.topBarBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  fullscreenTopScrim: {
    height: 170,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fullscreenTriggerHeader: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  fullscreenTrigger: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    bottom: spacing.xs,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    width: 36,
  },
  fullscreenTriggerPressed: {
    transform: [{ scale: interaction.iconButton.pressedScale }],
  },
  globeAnimation: {
    height: 232,
    width: '100%',
  },
  globeHeroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  globeHeroSubtitle: {
    lineHeight: 16,
    maxWidth: '95%',
  },
  globeHeroTitle: {
    lineHeight: 25,
  },
  globeHeroTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  globeLiveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: eventsSurface.occurrence.categoryBadgeBackground,
    borderColor: eventsSurface.occurrence.categoryBadgeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  globeLiveBadgeText: {
    textTransform: 'none',
  },
  globeMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  globeFallbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  globeFallbackWrapFullscreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  globeFallbackBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  globeFallbackBadgeText: {
    textTransform: 'none',
  },
  globeFallbackDetail: {
    maxWidth: 300,
    textAlign: 'center',
  },
  globeFallbackHintRow: {
    alignItems: 'center',
    backgroundColor: eventsSurface.occurrence.ctaBackground,
    borderColor: eventsSurface.occurrence.ctaBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  globeFallbackPanel: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.cardBackground,
    borderColor: eventsSurface.globe.cardBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 340,
    minHeight: 260,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  globeFallbackTitle: {
    color: eventsSurface.occurrence.itemTitle,
    textAlign: 'center',
  },
  globeMap: {
    backgroundColor: 'transparent',
    height: '100%',
    width: '100%',
  },
  globeMapFrame: {
    alignItems: 'center',
    height: 280,
    justifyContent: 'center',
    width: '100%',
  },
  globeMapFrameFullscreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  globeMapFullscreen: {
    backgroundColor: 'transparent',
    flex: 1,
    width: '100%',
  },
  globeMapMask: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: eventsSurface.globe.frameBorder,
    borderRadius: GLOBE_DIAMETER / 2,
    borderWidth: 1,
    height: GLOBE_DIAMETER,
    justifyContent: 'center',
    overflow: 'hidden',
    width: GLOBE_DIAMETER,
  },
  globeMapMaskFullscreen: {
    backgroundColor: eventsSurface.globeFullscreen.frameBackground,
    borderColor: eventsSurface.globeFullscreen.frameBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  globePanel: {
    backgroundColor: eventsSurface.globe.cardBackground,
    borderColor: eventsSurface.globe.cardBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 0,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
    position: 'relative',
  },
  globePrivacyNote: {
    lineHeight: 15,
    maxWidth: '98%',
    textAlign: 'center',
  },
  glowSpot: {
    backgroundColor: eventsSurface.globe.spotCore,
    borderRadius: radii.pill,
    height: 236,
    position: 'absolute',
    width: 236,
  },
  legendChip: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globeFullscreen.legendBackground,
    borderColor: eventsSurface.globeFullscreen.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  legendDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendText: {
    textTransform: 'none',
  },
  mapFallbackText: {
    maxWidth: 290,
    textAlign: 'center',
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  metaPillMuted: {
    opacity: 0.78,
  },
  noMotion: {
    opacity: 1,
  },
  selectionAccentChip: {
    alignItems: 'center',
    backgroundColor: eventsSurface.globe.legendBackground,
    borderColor: eventsSurface.globe.legendBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  selectionActions: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  selectionHeader: {
    gap: spacing.xxs,
  },
  selectionMetaStack: {
    gap: 1,
  },
  selectionPreview: {
    bottom: spacing.md,
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
  },
  selectionPreviewCard: {
    backgroundColor: eventsSurface.globeFullscreen.previewBackground,
    borderColor: eventsSurface.globeFullscreen.previewBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectionStatusChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  selectionStatusLive: {
    backgroundColor: eventsSurface.occurrence.liveChipBackground,
    borderColor: eventsSurface.occurrence.liveChipBorder,
  },
  selectionStatusLiveText: {
    color: eventsSurface.occurrence.liveChipText,
  },
  selectionStatusSoon: {
    backgroundColor: eventsSurface.occurrence.soonChipBackground,
    borderColor: eventsSurface.occurrence.soonChipBorder,
  },
  selectionStatusSoonText: {
    color: eventsSurface.occurrence.soonChipText,
  },
  selectionStatusText: {
    textTransform: 'uppercase',
  },
  selectionStateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  selectionStatusUpcoming: {
    backgroundColor: eventsSurface.occurrence.upcomingChipBackground,
    borderColor: eventsSurface.occurrence.upcomingChipBorder,
  },
  selectionStatusUpcomingText: {
    color: eventsSurface.occurrence.upcomingChipText,
  },
  selectionTitle: {
    color: eventsSurface.globeFullscreen.previewTitle,
    lineHeight: 25,
  },
  section: {
    gap: spacing.sm,
  },
});

