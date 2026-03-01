import { Platform } from 'react-native';

export const colors = {
  backgroundTop: '#050710',
  backgroundBottom: '#131b38',
  auroraPrimary: '#27d2ff',
  auroraSecondary: '#7f8dff',
  textPrimary: '#f3f7ff',
  textSecondary: '#b2bdd8',
  border: 'rgba(120, 158, 255, 0.28)',
  card: 'rgba(10, 16, 35, 0.62)',
  buttonPrimary: '#3dd9ff',
  buttonPrimaryText: '#06111f',
  buttonSecondary: 'rgba(112, 133, 255, 0.2)',
  buttonSecondaryText: '#d9e5ff',
  success: '#49f59e',
  danger: '#ff496c',
  info: '#4ea1ff',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  family: {
    display: Platform.select({
      ios: 'CormorantGaramond_700Bold',
      android: 'CormorantGaramond_700Bold',
      default: 'serif',
    }),
    body: Platform.select({
      ios: 'SpaceGrotesk_400Regular',
      android: 'SpaceGrotesk_400Regular',
      default: 'sans-serif',
    }),
    bodySemibold: Platform.select({
      ios: 'SpaceGrotesk_600SemiBold',
      android: 'SpaceGrotesk_600SemiBold',
      default: 'sans-serif-medium',
    }),
  },
  size: {
    caption: 12,
    body: 16,
    bodyLg: 18,
    title: 24,
    hero: 34,
  },
  lineHeight: {
    caption: 16,
    body: 22,
    bodyLg: 26,
    title: 30,
    hero: 40,
  },
} as const;

export const eventMarkerColors = {
  live: colors.danger,
  scheduled: colors.info,
  user: colors.success,
} as const;
