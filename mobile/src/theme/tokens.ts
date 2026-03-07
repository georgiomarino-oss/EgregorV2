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
  glowGold: figmaV2Reference.backgrounds.solo.radials[0].stops[0].color,
  textPrimary: figmaV2Reference.text.heading,
  textSecondary: figmaV2Reference.text.body,
  textBodySoft: figmaV2Reference.text.bodySoft,
  textLabel: figmaV2Reference.text.label,
  textCaption: figmaV2Reference.text.caption,
  textMuted: figmaV2Reference.text.muted,
  textOnMint: figmaV2Reference.buttons.mint.text,
  textOnGold: figmaV2Reference.buttons.gold.text,
  textOnSky: figmaV2Reference.buttons.sky.text,
  surface: figmaV2Reference.surfaces.default.backgroundColor,
  surfaceStrong: figmaV2Reference.surfaces.homeStatSmall.backgroundColor,
  borderStrong: figmaV2Reference.shell.borderColor,
  borderMedium: figmaV2Reference.surfaces.default.borderColor,
  borderSoft: figmaV2Reference.tabs.containerBorder,
  borderFaint: figmaV2Reference.borders.faint,
  accentMintStart: figmaV2Reference.buttons.mint.from,
  accentMintEnd: figmaV2Reference.buttons.mint.to,
  accentGoldStart: figmaV2Reference.buttons.gold.from,
  accentGoldEnd: figmaV2Reference.buttons.gold.to,
  accentSoftGoldStart: figmaV2Reference.buttons.softGold.from,
  accentSoftGoldEnd: figmaV2Reference.buttons.softGold.to,
  accentSkyStart: figmaV2Reference.buttons.sky.from,
  accentSkyEnd: figmaV2Reference.buttons.sky.to,
  live: figmaV2Reference.markers.live,
  scheduled: figmaV2Reference.markers.scheduled,
  user: figmaV2Reference.markers.user,
  success: figmaV2Reference.status.success,
  danger: figmaV2Reference.status.danger,
  warning: figmaV2Reference.status.warning,
  backdrop: figmaV2Reference.overlays.backdrop,
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
    body: 12,
    bodyLg: 18,
    caption: 11,
    label: 11,
    metric: 41,
  },
  lineHeight: {
    h1: 32.4,
    h2: 26,
    body: 17.4,
    bodyLg: 24,
    caption: 14,
    label: 13.2,
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

export const eventMapColors = {
  live: figmaV2Reference.markers.live,
  news: figmaV2Reference.status.warning,
  scheduled: figmaV2Reference.markers.scheduled,
  user: figmaV2Reference.markers.user,
} as const;

export const eventsSurface = {
  filter: figmaV2Reference.eventsSurface.filter,
  globe: figmaV2Reference.eventsSurface.globe,
  globeFullscreen: figmaV2Reference.eventsSurface.globeFullscreen,
  hero: figmaV2Reference.eventsSurface.hero,
  occurrence: figmaV2Reference.eventsSurface.occurrence,
} as const;

export const communitySurface = {
  alerts: figmaV2Reference.communitySurface.alerts,
  circles: figmaV2Reference.communitySurface.circles,
  hero: figmaV2Reference.communitySurface.hero,
  metrics: figmaV2Reference.communitySurface.metrics,
} as const;

export const circleSurface = {
  events: figmaV2Reference.circleSurface.events,
  prayer: figmaV2Reference.circleSurface.prayer,
} as const;

export const profileSurface = {
  hero: figmaV2Reference.profileSurface.hero,
  journal: figmaV2Reference.profileSurface.journal,
  metrics: figmaV2Reference.profileSurface.metrics,
  utility: figmaV2Reference.profileSurface.utility,
} as const;

export const soloSurface = {
  card: figmaV2Reference.soloSurface.card,
  filters: figmaV2Reference.soloSurface.filters,
  hero: figmaV2Reference.soloSurface.hero,
  library: figmaV2Reference.soloSurface.library,
  section: figmaV2Reference.soloSurface.section,
} as const;

export const handoffSurface = {
  eventDetails: figmaV2Reference.handoffSurface.eventDetails,
  soloSetup: figmaV2Reference.handoffSurface.soloSetup,
} as const;

export const crossApp = figmaV2Reference.crossApp;
export const feedbackSurface = figmaV2Reference.crossApp.feedback;
export const interaction = figmaV2Reference.crossApp.interaction;
export const liveLogoPalette = figmaV2Reference.liveLogo;

export const statusChipPalette = {
  danger: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.state.errorBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.state.errorBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.state.errorText,
  },
  live: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.liveBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.liveBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.liveText,
  },
  neutral: {
    backgroundColor: figmaV2Reference.soloSurface.filters.modeChipBackground,
    borderColor: figmaV2Reference.soloSurface.filters.modeChipBorder,
    textColor: figmaV2Reference.soloSurface.filters.modeChipText,
  },
  scheduled: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.scheduledBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.scheduledBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.scheduledText,
  },
  soon: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.soonBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.soonBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.soonText,
  },
  success: {
    backgroundColor: figmaV2Reference.profileSurface.journal.saveActiveBackground,
    borderColor: figmaV2Reference.profileSurface.journal.saveActiveBorder,
    textColor: figmaV2Reference.profileSurface.journal.saveActiveText,
  },
  template: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.templateBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.templateBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.templateText,
  },
  upcoming: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.upcomingBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.upcomingBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.upcomingText,
  },
  warning: {
    backgroundColor: figmaV2Reference.handoffSurface.eventDetails.status.soonBackground,
    borderColor: figmaV2Reference.handoffSurface.eventDetails.status.soonBorder,
    textColor: figmaV2Reference.handoffSurface.eventDetails.status.soonText,
  },
} as const;

export const roomAtmosphere = {
  solo: {
    auraInner: figmaV2Reference.rooms.solo.auraInner,
    auraOuter: figmaV2Reference.rooms.solo.auraOuter,
    mistFrom: figmaV2Reference.rooms.solo.mistFrom,
    mistTo: figmaV2Reference.rooms.solo.mistTo,
    panelBackground: figmaV2Reference.rooms.solo.panelBackground,
    panelBorder: figmaV2Reference.rooms.solo.panelBorder,
    scriptGlow: figmaV2Reference.rooms.solo.scriptGlow,
    scriptWord: figmaV2Reference.rooms.solo.scriptWord,
    selectorBackground: figmaV2Reference.rooms.solo.selectorBackground,
    selectorBorder: figmaV2Reference.rooms.solo.selectorBorder,
    transportFill: figmaV2Reference.rooms.solo.transportFill,
    transportTrack: figmaV2Reference.rooms.solo.transportTrack,
  },
  collective: {
    auraInner: figmaV2Reference.rooms.collective.auraInner,
    auraOuter: figmaV2Reference.rooms.collective.auraOuter,
    energy: figmaV2Reference.rooms.collective.energy,
    liveChipBackground: figmaV2Reference.rooms.collective.liveChipBackground,
    liveChipBorder: figmaV2Reference.rooms.collective.liveChipBorder,
    mistFrom: figmaV2Reference.rooms.collective.mistFrom,
    mistTo: figmaV2Reference.rooms.collective.mistTo,
    panelBackground: figmaV2Reference.rooms.collective.panelBackground,
    panelBorder: figmaV2Reference.rooms.collective.panelBorder,
    scriptGlow: figmaV2Reference.rooms.collective.scriptGlow,
    scriptWord: figmaV2Reference.rooms.collective.scriptWord,
    selectorBackground: figmaV2Reference.rooms.collective.selectorBackground,
    selectorBorder: figmaV2Reference.rooms.collective.selectorBorder,
    transportFill: figmaV2Reference.rooms.collective.transportFill,
    transportTrack: figmaV2Reference.rooms.collective.transportTrack,
  },
} as const;

export const motion = {
  amplitude: figmaV2Reference.motion.amplitude,
  durationMs: figmaV2Reference.motion.durationMs,
  easing: figmaV2Reference.motion.easing,
  liveLogo: figmaV2Reference.motion.liveLogo,
  reduced: figmaV2Reference.motion.reduced,
  room: figmaV2Reference.motion.room,
} as const;

export const signatureMoments = {
  appEntry: {
    baseBackground: '#04060C',
    beamCore: '#E6F6FF',
    beamGlow: 'rgba(133, 214, 255, 0.34)',
    beamOuter: 'rgba(133, 214, 255, 0)',
    portalCore: '#B6EAFF',
    portalRing: 'rgba(173, 228, 255, 0.62)',
    invocationGlow: 'rgba(255, 213, 154, 0.22)',
    panelBackground: 'rgba(9, 29, 45, 0.86)',
    panelBorder: 'rgba(118, 174, 207, 0.54)',
    statusText: '#D9EEFB',
  },
  collectiveField: {
    ringStrong: 'rgba(147, 223, 255, 0.62)',
    ringSoft: 'rgba(147, 223, 255, 0.3)',
    presenceNode: '#C2EEFF',
    presenceNodeMuted: 'rgba(194, 238, 255, 0.52)',
    stageGlow: 'rgba(255, 204, 133, 0.2)',
    stageScrim: 'rgba(6, 18, 30, 0.52)',
  },
  sharedSync: {
    hostNode: '#F9D39C',
    participantNode: '#B5DFFF',
    tetherCore: '#9FD6FF',
    tetherGlow: 'rgba(159, 214, 255, 0.32)',
    wave: 'rgba(255, 218, 166, 0.56)',
    supportText: '#D8EAF8',
  },
  fallback: {
    lowEndStaticOpacity: 0.64,
    reducedMotionDriftPx: 0,
  },
} as const;

export const semanticState = {
  active: {
    background: 'rgba(24, 66, 95, 0.84)',
    border: 'rgba(120, 186, 221, 0.7)',
    text: colors.textPrimary,
  },
  disabled: {
    background: 'rgba(11, 30, 45, 0.72)',
    border: 'rgba(93, 132, 160, 0.44)',
    text: colors.textMuted,
  },
  error: {
    background: feedbackSurface.errorPanelBackground,
    border: feedbackSurface.errorPanelBorder,
    text: feedbackSurface.errorTitle,
  },
  loading: {
    background: feedbackSurface.loadingPanelBackground,
    border: feedbackSurface.loadingPanelBorder,
    text: feedbackSurface.loadingTitle,
  },
  success: {
    background: 'rgba(64, 215, 184, 0.2)',
    border: 'rgba(85, 222, 194, 0.62)',
    text: '#D6FBF2',
  },
  warning: {
    background: feedbackSurface.warningPanelBackground,
    border: feedbackSurface.warningPanelBorder,
    text: feedbackSurface.warningTitle,
  },
} as const;

export const navigationSurface = {
  topBar: {
    background: 'rgba(6, 26, 40, 0.78)',
    border: 'rgba(104, 153, 184, 0.52)',
  },
  tabBar: {
    backgroundFrom: figmaV2Reference.tabs.containerGradient.colors[0],
    backgroundTo: figmaV2Reference.tabs.containerGradient.colors[1],
    border: figmaV2Reference.tabs.containerBorder,
    glow: 'rgba(121, 201, 238, 0.16)',
  },
} as const;

export type CollectiveEnergyLevel = keyof typeof roomAtmosphere.collective.energy;
export type LiveLogoContext = keyof typeof liveLogoPalette;
