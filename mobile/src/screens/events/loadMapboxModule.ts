import { NativeModules } from 'react-native';

interface MapboxModuleLike {
  Camera?: unknown;
  CircleLayer?: unknown;
  MapView?: unknown;
  ShapeSource?: unknown;
  StyleURL?: Record<string, string>;
  setAccessToken?: (token: string) => void;
}

let cachedMapboxModule: MapboxModuleLike | null | false = null;

export function loadMapboxModule() {
  if (cachedMapboxModule === false) {
    return null;
  }

  if (cachedMapboxModule) {
    return cachedMapboxModule;
  }

  // Avoid requiring @rnmapbox/maps unless the native bridge is actually present.
  // Expo Go and non-rebuilt dev clients won't have RNMBXModule and the package throws on import.
  if (!NativeModules?.RNMBXModule) {
    cachedMapboxModule = false;
    return null;
  }

  try {
    // Dynamic require prevents Expo Go startup crashes when @rnmapbox/maps is not present.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const moduleRef = require('@rnmapbox/maps') as MapboxModuleLike;
    cachedMapboxModule = moduleRef;
    return moduleRef;
  } catch {
    cachedMapboxModule = false;
    return null;
  }
}
