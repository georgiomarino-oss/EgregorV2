import type { ComponentType } from 'react';

export type EventTimeFilter = 'live' | 'today' | 'tomorrow' | null;
export type CategoryFilter = 'All' | string | null;
export type LiveOccurrenceState = 'ended' | 'live' | 'upcoming' | 'waiting_room';
export type EventStatusChip = LiveOccurrenceState | 'soon';
export type LiveFeedSectionKey =
  | 'global_flagships'
  | 'live_now'
  | 'my_circles'
  | 'next_24_hours'
  | 'ritual_1111'
  | 'saved_reminded';

export interface ScheduledEventOccurrence {
  accessMode?: 'circle_members' | 'invite_only' | 'open';
  body: string;
  category: string;
  countryCode?: string | null;
  durationMinutes: number;
  favoriteKey: string;
  locationHint?: string | null;
  occurrenceId?: string;
  occurrenceKey: string;
  roomId?: string | null;
  seriesId?: string;
  seriesKey?: string;
  script: string;
  source: 'occurrence';
  startsAt: string;
  startsCount: number;
  status: EventStatusChip;
  subscriptionKey?: string;
  title: string;
  visibilityScope?: 'circle' | 'global' | 'private';
}

export type Coordinate = [number, number];
export type GlobePointKind = 'live' | 'news' | 'scheduled' | 'user';

export interface GlobePoint {
  coordinate: Coordinate;
  id: string;
  kind: GlobePointKind;
}

export interface MapFeatureCollection {
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

export interface MapPressFeature {
  id?: unknown;
  properties?: {
    id?: unknown;
  };
}

export type MapboxComponent = ComponentType<Record<string, unknown>>;

export interface MapboxGlobeModule {
  Camera?: unknown;
  CircleLayer?: unknown;
  MapView?: unknown;
  ShapeSource?: unknown;
  StyleURL?: Record<string, string>;
  setAccessToken?: (token: string) => void;
}

export interface MapboxCameraRefLike {
  setCamera?: (config: Record<string, unknown>) => void;
}

export interface OccurrenceSection {
  description?: string;
  category: string;
  items: ScheduledEventOccurrence[];
  key?: LiveFeedSectionKey;
}
