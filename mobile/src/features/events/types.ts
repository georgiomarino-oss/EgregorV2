import type { ComponentType } from 'react';

export type EventTimeFilter = 'live' | 'today' | 'tomorrow' | null;
export type CategoryFilter = 'All' | string | null;
export type EventStatusChip = 'live' | 'soon' | 'upcoming';

export interface ScheduledEventOccurrence {
  body: string;
  category: string;
  countryCode?: string | null;
  durationMinutes: number;
  favoriteKey: string;
  locationHint?: string | null;
  occurrenceKey: string;
  script: string;
  source: 'news' | 'template';
  startsAt: string;
  startsCount: number;
  status: EventStatusChip;
  title: string;
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
  category: string;
  items: ScheduledEventOccurrence[];
}
