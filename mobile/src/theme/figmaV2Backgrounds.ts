export interface BackgroundLinearRecipe {
  angleDeg: number;
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
}

export interface BackgroundRadialStop {
  color: string;
  offset: number;
}

export interface BackgroundRadialRecipe {
  matrix: string;
  stops: readonly BackgroundRadialStop[];
}

export interface BackgroundRecipe {
  linear: BackgroundLinearRecipe;
  radials: readonly [BackgroundRadialRecipe, ...BackgroundRadialRecipe[]];
}

const homeLinear: BackgroundLinearRecipe = {
  angleDeg: 177.3378032907102,
  colors: ['#081729', '#061222'],
  locations: [0.016282, 0.98372],
};

const homeRadial: BackgroundRadialRecipe = {
  matrix: 'matrix(0 -22 -26 0 108.96 -48.36)',
  stops: [
    { color: 'rgba(124,215,255,0.12)', offset: 0 },
    { color: 'rgba(62,108,128,0.06)', offset: 0.325 },
    { color: 'rgba(0,0,0,0)', offset: 0.65 },
  ],
};

const welcomeLinear: BackgroundLinearRecipe = {
  angleDeg: 177.33781696089176,
  colors: ['#122744', '#0B1731'],
  locations: [0.016282, 0.98372],
};

const welcomeRadial: BackgroundRadialRecipe = {
  matrix: 'matrix(0 -22 -30 0 108.96 -64.48)',
  stops: [
    { color: 'rgba(121,175,233,0.2)', offset: 0 },
    { color: 'rgba(61,88,117,0.1)', offset: 0.31 },
    { color: 'rgba(0,0,0,0)', offset: 0.62 },
  ],
};

export const figmaV2Backgrounds = {
  // Node 0:86
  home: {
    linear: homeLinear,
    radials: [homeRadial],
  },
  // Node 0:150 (same recipe as Home)
  events: {
    linear: homeLinear,
    radials: [homeRadial],
  },
  // Node 16:67
  solo: {
    linear: welcomeLinear,
    radials: [welcomeRadial],
  },
  // Auth follows the same recipe as welcome in the v2 pass
  auth: {
    linear: welcomeLinear,
    radials: [welcomeRadial],
  },
  // Node 0:387
  profile: {
    linear: {
      angleDeg: 177.33785823862775,
      colors: ['#132442', '#0B1731'],
      locations: [0.016282, 0.98372],
    },
    radials: [
      {
        matrix: 'matrix(0 -22 -26 0 121.07 -32.24)',
        stops: [
          { color: 'rgba(144,198,255,0.19)', offset: 0 },
          { color: 'rgba(72,99,128,0.095)', offset: 0.325 },
          { color: 'rgba(0,0,0,0)', offset: 0.65 },
        ],
      },
    ],
  },
} as const satisfies Record<'auth' | 'home' | 'solo' | 'events' | 'profile', BackgroundRecipe>;
