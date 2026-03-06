import type { Coordinate, GlobePoint, MapFeatureCollection, MapPressFeature } from '../types';

const MAJOR_CITY_COORDINATES: Coordinate[] = [
  [-74.006, 40.7128],
  [-118.2437, 34.0522],
  [-79.3832, 43.6532],
  [-99.1332, 19.4326],
  [-46.6333, -23.5505],
  [-58.3816, -34.6037],
  [-0.1276, 51.5072],
  [2.3522, 48.8566],
  [13.405, 52.52],
  [-3.7038, 40.4168],
  [31.2357, 30.0444],
  [35.2137, 31.7683],
  [37.6173, 55.7558],
  [28.9784, 41.0082],
  [55.2708, 25.2048],
  [72.8777, 19.076],
  [77.209, 28.6139],
  [90.4125, 23.8103],
  [67.0099, 24.8615],
  [116.4074, 39.9042],
  [121.4737, 31.2304],
  [139.6917, 35.6895],
  [126.978, 37.5665],
  [103.8198, 1.3521],
  [100.5018, 13.7563],
  [106.8456, -6.2088],
  [151.2093, -33.8688],
  [144.9631, -37.8136],
  [174.7633, -36.8485],
  [18.4241, -33.9249],
  [28.0473, -26.2041],
  [36.8219, -1.2921],
  [3.3792, 6.5244],
];

const COUNTRY_CODE_TO_COORDINATE: Record<string, Coordinate> = {
  AF: [69.2075, 34.5553],
  AE: [55.2708, 25.2048],
  AR: [-58.3816, -34.6037],
  AU: [151.2093, -33.8688],
  BD: [90.4125, 23.8103],
  BR: [-46.6333, -23.5505],
  CA: [-79.3832, 43.6532],
  CN: [116.4074, 39.9042],
  DE: [13.405, 52.52],
  EG: [31.2357, 30.0444],
  ES: [-3.7038, 40.4168],
  FR: [2.3522, 48.8566],
  GB: [-0.1276, 51.5072],
  IL: [35.2137, 31.7683],
  IN: [77.209, 28.6139],
  IR: [51.389, 35.6892],
  IT: [12.4964, 41.9028],
  JP: [139.6917, 35.6895],
  KE: [36.8219, -1.2921],
  KR: [126.978, 37.5665],
  LB: [35.5018, 33.8938],
  MM: [96.1735, 16.8409],
  MX: [-99.1332, 19.4326],
  NG: [3.3792, 6.5244],
  NZ: [174.7633, -36.8485],
  PK: [67.0099, 24.8615],
  PS: [35.2137, 31.7683],
  PT: [-9.1393, 38.7223],
  RU: [37.6173, 55.7558],
  SD: [32.5599, 15.5007],
  SY: [36.2913, 33.5138],
  TR: [28.9784, 41.0082],
  UA: [30.5234, 50.4501],
  US: [-74.006, 40.7128],
  ZA: [28.0473, -26.2041],
};

const LOCATION_KEYWORDS: Array<{ coordinate: Coordinate; keywords: string[] }> = [
  { coordinate: [51.389, 35.6892], keywords: ['iran', 'tehran', 'isfahan', 'mashhad'] },
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

export function clampCoordinate([longitude, latitude]: Coordinate): Coordinate {
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

export function jitterCoordinate(coordinate: Coordinate, seed: string, spread = 0.65): Coordinate {
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

export function resolveEventCoordinate(input: {
  countryCode?: string | null;
  description?: string | null;
  locationHint?: string | null;
  region?: string | null;
  seed: string;
  title: string;
}): Coordinate {
  const text =
    `${input.title} ${input.description ?? ''} ${input.locationHint ?? ''} ${input.region ?? ''}`.trim();
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

export function toFeatureCollection(points: GlobePoint[]): MapFeatureCollection {
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

export function extractPressedMapFeatureId(pressEvent: unknown): string | null {
  const eventObject = pressEvent as { features?: MapPressFeature[] };
  const features = eventObject?.features;
  if (!Array.isArray(features)) {
    return null;
  }

  for (const feature of features) {
    const idFromProps = feature?.properties?.id;
    if (typeof idFromProps === 'string' && idFromProps.length > 0) {
      return idFromProps;
    }

    if (typeof feature?.id === 'string' && feature.id.length > 0) {
      return feature.id;
    }
  }

  return null;
}

export function easeOutCubic(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - clamped, 3);
}
