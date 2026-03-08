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

export type SectionThemeKey = 'solo' | 'circles' | 'live' | 'profile';

export const sectionVisualThemes = {
  solo: {
    background: {
      linear: ['#201B35', '#0D1020'] as const,
      veil: ['rgba(129, 102, 194, 0.24)', 'rgba(24, 18, 42, 0)'] as const,
      orbA: 'rgba(215, 182, 255, 0.22)',
      orbB: 'rgba(249, 212, 161, 0.16)',
    },
    nav: {
      border: 'rgba(161, 140, 198, 0.56)',
      edgeGlow: 'rgba(207, 174, 248, 0.2)',
      gradient: ['rgba(34, 24, 55, 0.94)', 'rgba(18, 15, 33, 0.97)'] as const,
      iconActive: '#F6ECFF',
      iconIdle: '#B6A8CC',
      itemActive: ['rgba(115, 92, 166, 0.86)', 'rgba(75, 56, 116, 0.78)'] as const,
      itemBorder: 'rgba(197, 174, 235, 0.68)',
      labelActive: '#EFE3FF',
      labelIdle: '#B8ACCB',
    },
    surface: {
      border: 'rgba(161, 141, 201, 0.56)',
      halo: 'rgba(206, 178, 244, 0.24)',
      hero: ['rgba(66, 49, 104, 0.94)', 'rgba(27, 22, 44, 0.94)'] as const,
      card: ['rgba(54, 41, 85, 0.9)', 'rgba(24, 19, 40, 0.9)'] as const,
      highlight: 'rgba(247, 210, 156, 0.82)',
      edge: 'rgba(214, 191, 247, 0.56)',
    },
    media: {
      fallback: ['rgba(111, 80, 164, 0.86)', 'rgba(48, 35, 82, 0.88)'] as const,
      frameBorder: 'rgba(197, 175, 234, 0.62)',
      icon: '#F2E7FF',
      scrim: ['rgba(14, 10, 25, 0)', 'rgba(14, 10, 25, 0.88)'] as const,
    },
  },
  circles: {
    background: {
      linear: ['#062533', '#04131F'] as const,
      veil: ['rgba(120, 236, 255, 0.24)', 'rgba(7, 28, 41, 0)'] as const,
      orbA: 'rgba(136, 232, 255, 0.24)',
      orbB: 'rgba(88, 198, 227, 0.2)',
    },
    nav: {
      border: 'rgba(112, 185, 218, 0.6)',
      edgeGlow: 'rgba(121, 214, 246, 0.24)',
      gradient: ['rgba(8, 44, 62, 0.94)', 'rgba(4, 21, 34, 0.97)'] as const,
      iconActive: '#EAFAFF',
      iconIdle: '#9FC6D8',
      itemActive: ['rgba(20, 86, 111, 0.86)', 'rgba(9, 56, 78, 0.78)'] as const,
      itemBorder: 'rgba(133, 216, 248, 0.72)',
      labelActive: '#DEFAFF',
      labelIdle: '#9FC5D8',
    },
    surface: {
      border: 'rgba(111, 189, 220, 0.58)',
      halo: 'rgba(113, 234, 255, 0.2)',
      hero: ['rgba(8, 75, 98, 0.94)', 'rgba(6, 36, 52, 0.94)'] as const,
      card: ['rgba(8, 55, 74, 0.9)', 'rgba(5, 29, 43, 0.9)'] as const,
      highlight: 'rgba(178, 243, 255, 0.84)',
      edge: 'rgba(138, 223, 251, 0.62)',
    },
    media: {
      fallback: ['rgba(11, 85, 108, 0.86)', 'rgba(4, 43, 61, 0.88)'] as const,
      frameBorder: 'rgba(141, 221, 250, 0.62)',
      icon: '#DFF8FF',
      scrim: ['rgba(4, 19, 30, 0)', 'rgba(4, 19, 30, 0.88)'] as const,
    },
  },
  live: {
    background: {
      linear: ['#061221', '#020913'] as const,
      veil: ['rgba(119, 205, 255, 0.22)', 'rgba(6, 18, 30, 0)'] as const,
      orbA: 'rgba(153, 218, 255, 0.23)',
      orbB: 'rgba(255, 202, 136, 0.2)',
    },
    nav: {
      border: 'rgba(122, 181, 216, 0.62)',
      edgeGlow: 'rgba(141, 214, 255, 0.22)',
      gradient: ['rgba(7, 34, 54, 0.94)', 'rgba(3, 14, 26, 0.97)'] as const,
      iconActive: '#EFF8FF',
      iconIdle: '#A8C5D9',
      itemActive: ['rgba(24, 72, 106, 0.9)', 'rgba(13, 44, 71, 0.82)'] as const,
      itemBorder: 'rgba(152, 207, 242, 0.72)',
      labelActive: '#E6F6FF',
      labelIdle: '#A7C5D8',
    },
    surface: {
      border: 'rgba(125, 186, 222, 0.58)',
      halo: 'rgba(143, 216, 255, 0.22)',
      hero: ['rgba(16, 70, 104, 0.92)', 'rgba(8, 36, 58, 0.94)'] as const,
      card: ['rgba(10, 48, 76, 0.9)', 'rgba(6, 27, 43, 0.9)'] as const,
      highlight: 'rgba(255, 211, 151, 0.86)',
      edge: 'rgba(163, 217, 248, 0.64)',
    },
    media: {
      fallback: ['rgba(17, 70, 104, 0.86)', 'rgba(8, 36, 58, 0.88)'] as const,
      frameBorder: 'rgba(155, 215, 250, 0.64)',
      icon: '#E4F4FF',
      scrim: ['rgba(4, 17, 29, 0)', 'rgba(4, 17, 29, 0.9)'] as const,
    },
  },
  profile: {
    background: {
      linear: ['#1A242F', '#0D131E'] as const,
      veil: ['rgba(164, 190, 213, 0.18)', 'rgba(16, 22, 32, 0)'] as const,
      orbA: 'rgba(168, 188, 210, 0.2)',
      orbB: 'rgba(224, 197, 160, 0.15)',
    },
    nav: {
      border: 'rgba(132, 154, 176, 0.58)',
      edgeGlow: 'rgba(171, 193, 214, 0.18)',
      gradient: ['rgba(34, 47, 60, 0.94)', 'rgba(17, 25, 35, 0.97)'] as const,
      iconActive: '#EEF6FE',
      iconIdle: '#A5BDCF',
      itemActive: ['rgba(66, 84, 100, 0.88)', 'rgba(43, 57, 70, 0.8)'] as const,
      itemBorder: 'rgba(168, 186, 206, 0.68)',
      labelActive: '#E5EEF8',
      labelIdle: '#A8C0D2',
    },
    surface: {
      border: 'rgba(130, 152, 175, 0.58)',
      halo: 'rgba(173, 192, 213, 0.18)',
      hero: ['rgba(57, 72, 86, 0.92)', 'rgba(27, 36, 47, 0.94)'] as const,
      card: ['rgba(44, 56, 69, 0.88)', 'rgba(22, 30, 39, 0.9)'] as const,
      highlight: 'rgba(236, 216, 185, 0.82)',
      edge: 'rgba(169, 186, 204, 0.6)',
    },
    media: {
      fallback: ['rgba(61, 76, 92, 0.86)', 'rgba(29, 38, 48, 0.88)'] as const,
      frameBorder: 'rgba(171, 190, 208, 0.62)',
      icon: '#E8F1FA',
      scrim: ['rgba(15, 21, 30, 0)', 'rgba(15, 21, 30, 0.9)'] as const,
    },
  },
} as const;

export const premiumSurfaceDepth = {
  tier1: {
    shadowColor: '#050E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 7,
  },
  tier2: {
    shadowColor: '#030A14',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 9,
  },
  tier3: {
    shadowColor: '#02060E',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const premiumHalo = {
  edgeFaint: 'rgba(211, 236, 255, 0.16)',
  edgeStrong: 'rgba(214, 238, 255, 0.3)',
  heroAura: 'rgba(149, 214, 255, 0.2)',
  innerGlow: 'rgba(255, 226, 179, 0.14)',
} as const;

export const imageOverlayTreatments = {
  cinematicDark: ['rgba(4, 12, 22, 0.02)', 'rgba(4, 12, 22, 0.9)'] as const,
  liveWarm: ['rgba(6, 18, 30, 0.08)', 'rgba(18, 9, 4, 0.74)'] as const,
  profileSoft: ['rgba(12, 19, 28, 0.06)', 'rgba(12, 19, 28, 0.82)'] as const,
} as const;

export const typographyHierarchy = {
  display: {
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroTitle: {
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 19,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;

export const compositionRhythm = {
  screen: {
    heroToSection: 16,
    sectionToSection: 14,
  },
  hero: {
    contentGap: 12,
    statGap: 8,
  },
  card: {
    contentGap: 10,
    footerGap: 8,
  },
} as const;

export const premiumInteraction = {
  focus: {
    ringColor: 'rgba(167, 226, 255, 0.72)',
    ringWidth: 1.2,
    scale: 1.01,
  },
  active: {
    borderBoost: 1.08,
    glowOpacity: 0.22,
  },
  pressed: {
    opacity: 0.94,
    scale: 0.986,
  },
} as const;

export const liveStatePalette = {
  alert: {
    background: 'rgba(255, 126, 149, 0.24)',
    border: 'rgba(255, 151, 167, 0.68)',
    text: '#FFEAF1',
  },
  ended: {
    background: 'rgba(74, 93, 111, 0.3)',
    border: 'rgba(128, 154, 179, 0.56)',
    text: '#D9E9F7',
  },
  live: {
    background: figmaV2Reference.handoffSurface.eventDetails.status.liveBackground,
    border: figmaV2Reference.handoffSurface.eventDetails.status.liveBorder,
    text: figmaV2Reference.handoffSurface.eventDetails.status.liveText,
  },
  upcoming: {
    background: figmaV2Reference.handoffSurface.eventDetails.status.upcomingBackground,
    border: figmaV2Reference.handoffSurface.eventDetails.status.upcomingBorder,
    text: figmaV2Reference.handoffSurface.eventDetails.status.upcomingText,
  },
} as const;

export const trustSafetyPalette = {
  block: {
    background: 'rgba(58, 23, 33, 0.66)',
    border: 'rgba(196, 119, 138, 0.66)',
    text: '#FFD9E2',
  },
  destructive: {
    background: 'rgba(62, 24, 31, 0.72)',
    border: 'rgba(205, 126, 140, 0.72)',
    text: '#FFE1E8',
  },
  report: {
    background: 'rgba(74, 54, 30, 0.7)',
    border: 'rgba(206, 167, 109, 0.66)',
    text: '#FFE9C7',
  },
} as const;

export const invitationStatePalette = {
  accepted: {
    background: 'rgba(74, 214, 181, 0.2)',
    border: 'rgba(105, 226, 198, 0.62)',
    text: '#D6FBF2',
  },
  declined: {
    background: 'rgba(81, 56, 42, 0.52)',
    border: 'rgba(198, 150, 118, 0.58)',
    text: '#FFE3CF',
  },
  expired: {
    background: 'rgba(63, 75, 92, 0.48)',
    border: 'rgba(127, 149, 170, 0.56)',
    text: '#D5E4F2',
  },
  pending: {
    background: 'rgba(255, 198, 116, 0.2)',
    border: 'rgba(255, 207, 141, 0.62)',
    text: '#FFE8C7',
  },
} as const;

export const transitionMotion = {
  inviteState: {
    duration: 260,
    easing: motion.easing.gentle,
  },
  navTheme: {
    duration: 320,
    easing: motion.easing.smoothOut,
  },
  roomJoin: {
    duration: 360,
    easing: motion.easing.smoothOut,
  },
} as const;

export const roomVisualFoundation = {
  lowPerfStaticOpacity: 0.6,
  qualityAndroidCutoffApi: 28,
  readabilityScrim: {
    solo: {
      from: 'rgba(15, 12, 25, 0.08)',
      to: 'rgba(12, 8, 20, 0.62)',
    },
    live: {
      from: 'rgba(7, 18, 32, 0.08)',
      to: 'rgba(4, 10, 19, 0.68)',
    },
  },
} as const;

export type CollectiveEnergyLevel = keyof typeof roomAtmosphere.collective.energy;
export type LiveLogoContext = keyof typeof liveLogoPalette;
