export interface FigmaLinearGradientRecipe {
  angleDeg: number;
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
}

export interface FigmaRadialGradientStop {
  color: string;
  offset: number;
}

export interface FigmaRadialGradientRecipe {
  matrix: string;
  stops: readonly FigmaRadialGradientStop[];
}

export interface FigmaGradientLayerRecipe {
  linear?: FigmaLinearGradientRecipe;
  radials?: readonly FigmaRadialGradientRecipe[];
}

export const figmaV2Reference = {
  shell: {
    borderColor: 'rgba(95,129,157,0.78)',
    borderRadius: 34,
    borderWidth: 0.8,
    shadowColor: 'rgba(0,5,12,0.58)',
  },
  text: {
    heading: '#EFF9FF',
    body: '#ABC6D8',
    bodyStrong: '#C1D8E9',
    caption: '#B6CDDF',
    label: '#A9C8DB',
    muted: '#95B6CC',
    tag: '#D8EEFE',
    activeTab: '#EBF7FF',
    input: '#DCEEFB',
    secondaryButton: '#DFF1FD',
    mintButton: '#083129',
    goldButton: '#35210B',
    skyButton: '#05213D',
  },
  backgrounds: {
    auth: {
      linear: {
        angleDeg: 177.33781696089176,
        colors: ['rgb(18, 39, 68)', 'rgb(11, 23, 49)'],
        locations: [0.016282, 0.98372],
      },
      radials: [
        {
          matrix: 'matrix(0 -22 -30 0 108.96 -64.48)',
          stops: [
            { color: 'rgba(121,175,233,0.2)', offset: 0 },
            { color: 'rgba(61,88,117,0.1)', offset: 0.31 },
            { color: 'rgba(0,0,0,0)', offset: 0.62 },
          ],
        },
      ],
    },
    home: {
      linear: {
        angleDeg: 177.3378032907102,
        colors: ['rgb(8, 23, 41)', 'rgb(6, 18, 34)'],
        locations: [0.016282, 0.98372],
      },
      radials: [
        {
          matrix: 'matrix(0 -22 -26 0 108.96 -48.36)',
          stops: [
            { color: 'rgba(124,215,255,0.12)', offset: 0 },
            { color: 'rgba(62,108,128,0.06)', offset: 0.325 },
            { color: 'rgba(0,0,0,0)', offset: 0.65 },
          ],
        },
      ],
    },
    profile: {
      linear: {
        angleDeg: 177.33785823862775,
        colors: ['rgb(19, 36, 66)', 'rgb(11, 23, 49)'],
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
    events: {
      linear: {
        angleDeg: 177.33785823862775,
        colors: ['rgb(21, 29, 52)', 'rgb(16, 23, 41)'],
        locations: [0.016282, 0.98372],
      },
      radials: [
        {
          matrix: 'matrix(0 -22 -26 0 484.27 -32.24)',
          stops: [
            { color: 'rgba(255,204,129,0.2)', offset: 0 },
            { color: 'rgba(128,102,65,0.1)', offset: 0.325 },
            { color: 'rgba(0,0,0,0)', offset: 0.65 },
          ],
        },
      ],
    },
    solo: {
      linear: {
        angleDeg: 177.3378032907102,
        colors: ['rgb(17, 31, 49)', 'rgb(10, 23, 37)'],
        locations: [0.016282, 0.98372],
      },
      radials: [
        {
          matrix: 'matrix(0 -22 -26 0 302.66 -32.24)',
          stops: [
            { color: 'rgba(255,220,164,0.19)', offset: 0 },
            { color: 'rgba(128,110,82,0.095)', offset: 0.325 },
            { color: 'rgba(0,0,0,0)', offset: 0.65 },
          ],
        },
      ],
    },
  },
  surfaces: {
    default: {
      backgroundColor: 'rgba(12,34,50,0.88)',
      borderColor: 'rgba(118,156,186,0.64)',
      borderWidth: 0.8,
    },
    authForm: {
      borderColor: 'rgba(118,156,186,0.64)',
      borderWidth: 0.8,
      layer: {
        linear: {
          angleDeg: 170.50171749685236,
          colors: ['rgba(17, 43, 64, 0.96)', 'rgba(10, 30, 46, 0.98)'],
          locations: [0.07735, 0.92265],
        },
        radials: [
          {
            matrix: 'matrix(0 -22 -38 0 452.26 -70.6)',
            stops: [
              { color: 'rgba(116,209,244,0.1)', offset: 0 },
              { color: 'rgba(0,0,0,0)', offset: 0.7 },
            ],
          },
        ],
      },
    },
    homeStatCard: {
      borderColor: 'rgba(102,141,171,0.55)',
      borderWidth: 0.8,
      layer: {
        linear: {
          angleDeg: 173.9814294516185,
          colors: ['rgba(17, 43, 64, 0.96)', 'rgba(10, 30, 46, 0.98)'],
          locations: [0.07735, 0.92265],
        },
        radials: [
          {
            matrix: 'matrix(0 -22 -38 0 452.58 -44.52)',
            stops: [
              { color: 'rgba(116,209,244,0.1)', offset: 0 },
              { color: 'rgba(0,0,0,0)', offset: 0.7 },
            ],
          },
        ],
      },
    },
    homeStatSmall: {
      backgroundColor: 'rgba(12,37,55,0.86)',
      borderColor: 'rgba(112,148,176,0.56)',
      borderWidth: 0.8,
    },
    homeAlert: {
      backgroundColor: 'rgba(12,34,50,0.88)',
      borderColor: 'rgba(118,156,186,0.64)',
      borderWidth: 0.8,
    },
    profileImpactCard: {
      borderColor: 'rgba(102,141,171,0.55)',
      borderWidth: 0.8,
      layer: {
        linear: {
          angleDeg: 176.03890916724248,
          colors: ['rgba(17, 43, 64, 0.96)', 'rgba(10, 30, 46, 0.98)'],
          locations: [0.07735, 0.92265],
        },
        radials: [
          {
            matrix: 'matrix(0 -22 -38 0 452.59 -29.24)',
            stops: [
              { color: 'rgba(116,209,244,0.1)', offset: 0 },
              { color: 'rgba(0,0,0,0)', offset: 0.7 },
            ],
          },
        ],
      },
    },
    profileRow: {
      backgroundColor: 'rgba(11,36,56,0.85)',
      borderColor: 'rgba(124,153,180,0.65)',
      borderWidth: 0.8,
    },
    eventRoomCurrent: {
      borderColor: 'rgba(111,148,176,0.62)',
      borderWidth: 0.8,
      layer: {
        linear: {
          angleDeg: 175.78511890666476,
          colors: ['rgba(18, 35, 56, 0.97)', 'rgba(11, 23, 43, 0.98)'],
          locations: [0.07735, 0.92265],
        },
        radials: [
          {
            matrix: 'matrix(0 -26 -40 0 282.87 186.72)',
            stops: [
              { color: 'rgba(255,198,115,0.333)', offset: 0 },
              { color: 'rgba(128,99,58,0.1665)', offset: 0.35 },
              { color: 'rgba(0,0,0,0)', offset: 0.7 },
            ],
          },
          {
            matrix: 'matrix(0 -22 -36 0 101.83 -24.896)',
            stops: [
              { color: 'rgba(126,225,255,0.243)', offset: 0 },
              { color: 'rgba(63,113,128,0.1215)', offset: 0.3 },
              { color: 'rgba(0,0,0,0)', offset: 0.6 },
            ],
          },
        ],
      },
    },
  },
  tabs: {
    containerGradient: {
      angleDeg: 180,
      colors: ['rgba(11,29,44,0.94)', 'rgba(8,22,35,0.96)'],
      locations: [0, 1],
    },
    containerBorder: 'rgba(112,145,171,0.6)',
    containerBorderWidth: 0.8,
    activeBackground: 'rgba(26,66,95,0.75)',
    activeBorder: 'rgba(128,179,211,0.68)',
    activeBorderWidth: 0.8,
    inactiveBorder: 'rgba(0,0,0,0)',
  },
  buttons: {
    mint: {
      from: '#46DEBC',
      to: '#93EBD4',
      text: '#083129',
    },
    gold: {
      from: '#FFD698',
      to: '#FFC06B',
      border: 'rgba(253, 204, 130, 0.74)',
      text: '#35210B',
    },
    softGold: {
      from: '#F7D59C',
      to: '#F2BE71',
      text: '#3A2911',
    },
    sky: {
      from: '#8FCBFF',
      to: '#78AFE8',
      border: 'rgba(124, 153, 180, 0.65)',
      text: '#05213D',
    },
    secondary: {
      background: 'rgba(16,43,63,0.9)',
      border: 'rgba(119,160,191,0.68)',
      text: '#DFF1FD',
    },
  },
  inputs: {
    auth: {
      background: 'rgba(13,35,53,0.84)',
      border: 'rgba(122,159,186,0.65)',
      text: '#DCEEFB',
    },
  },
  eventRoom: {
    progressTrackBorder: 'rgba(110,146,173,0.66)',
    progressFillFrom: '#98DDFF',
    progressFillTo: '#FFE1B5',
    miniButtonBackground: 'rgba(12,36,53,0.88)',
    miniButtonBorder: 'rgba(118,160,190,0.67)',
  },
} as const;
