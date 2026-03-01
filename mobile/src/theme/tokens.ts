import { Platform } from 'react-native';

import { figmaV2Reference } from './figma-v2-reference';

export const colors = {
  bgAuthStart: figmaV2Reference.backgrounds.auth.linear.colors[0],
  bgAuthEnd: figmaV2Reference.backgrounds.auth.linear.colors[1],
  bgHomeStart: figmaV2Reference.backgrounds.home.linear.colors[0],
  bgHomeEnd: figmaV2Reference.backgrounds.home.linear.colors[1],
  bgSoloStart: figmaV2Reference.backgrounds.solo.linear.colors[0],
  bgSoloEnd: figmaV2Reference.backgrounds.solo.linear.colors[1],
  bgEventsStart: figmaV2Reference.backgrounds.events.linear.colors[0],
  bgEventsEnd: figmaV2Reference.backgrounds.events.linear.colors[1],
  bgProfileStart: figmaV2Reference.backgrounds.profile.linear.colors[0],
  bgProfileEnd: figmaV2Reference.backgrounds.profile.linear.colors[1],
  glowCyan: figmaV2Reference.backgrounds.home.radials[0].stops[0].color,
  glowGold: figmaV2Reference.backgrounds.events.radials[0].stops[0].color,
  textPrimary: figmaV2Reference.text.heading,
  textSecondary: figmaV2Reference.text.body,
  textMuted: figmaV2Reference.text.muted,
  textOnMint: figmaV2Reference.buttons.mint.text,
  textOnGold: figmaV2Reference.buttons.gold.text,
  textOnSky: figmaV2Reference.buttons.sky.text,
  surface: figmaV2Reference.surfaces.default.backgroundColor,
  surfaceStrong: figmaV2Reference.surfaces.homeStatSmall.backgroundColor,
  borderStrong: figmaV2Reference.shell.borderColor,
  borderMedium: figmaV2Reference.surfaces.default.borderColor,
  borderSoft: figmaV2Reference.tabs.containerBorder,
  borderFaint: 'rgba(122,171,203,0.58)',
  accentMintStart: figmaV2Reference.buttons.mint.from,
  accentMintEnd: figmaV2Reference.buttons.mint.to,
  accentGoldStart: figmaV2Reference.buttons.gold.from,
  accentGoldEnd: figmaV2Reference.buttons.gold.to,
  accentSoftGoldStart: figmaV2Reference.buttons.softGold.from,
  accentSoftGoldEnd: figmaV2Reference.buttons.softGold.to,
  accentSkyStart: figmaV2Reference.buttons.sky.from,
  accentSkyEnd: figmaV2Reference.buttons.sky.to,
  live: '#FF5C72',
  scheduled: '#4EA1FF',
  user: '#46DEBC',
  success: '#46DEBC',
  danger: '#FF5C72',
  warning: '#FFC06B',
  backdrop: 'rgba(1, 6, 12, 0.6)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 17,
  xl: 20,
  xxl: 22,
  hero: 34,
  pill: 999,
} as const;

export const typography = {
  family: {
    regular: Platform.select({
      ios: 'Sora_400Regular',
      android: 'Sora_400Regular',
      default: 'sans-serif',
    }),
    medium: Platform.select({
      ios: 'Sora_500Medium',
      android: 'Sora_500Medium',
      default: 'sans-serif-medium',
    }),
    bold: Platform.select({
      ios: 'Sora_700Bold',
      android: 'Sora_700Bold',
      default: 'sans-serif-medium',
    }),
  },
  size: {
    h1: 30,
    h2: 20,
    body: 13,
    bodyLg: 18,
    caption: 11,
    label: 10,
    metric: 41,
  },
  lineHeight: {
    h1: 33,
    h2: 26,
    body: 18,
    bodyLg: 24,
    caption: 14,
    label: 13,
    metric: 41,
  },
  tracking: {
    normal: 0,
    tight: -0.6,
    wide: 0.8,
    wider: 1.2,
  },
} as const;

export const shadows = {
  shell: {
    shadowColor: '#00050C',
    shadowOffset: { width: 0, height: 26 },
    shadowOpacity: 0.58,
    shadowRadius: 26,
    elevation: 16,
  },
  card: {
    shadowColor: '#020A14',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: '#7CD7FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 0,
  },
} as const;

export const eventMarkerColors = {
  live: colors.live,
  scheduled: colors.scheduled,
  user: colors.user,
} as const;
