interface MapboxModuleLike {
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
