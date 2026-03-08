import {
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_ROW_HEIGHT,
  PROFILE_SECTION_GAP,
  SCREEN_PAD_X,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from './figmaV2Layout';

// Canonical Figma V2 layout constants.
export { PROFILE_ROW_HEIGHT, SCREEN_PAD_X };
export const GAP_HOME_SECTION = HOME_CARD_GAP;
export const GAP_PROFILE_SECTION = PROFILE_SECTION_GAP;
export const GAP_PROFILE_ROWS = PROFILE_ROW_GAP;
export const PROFILE_ROW_PAD_X = 12.8;
export const PROFILE_ROW_PAD_TOP = 10.8;
export const PROFILE_ROW_PAD_BOTTOM = 0.8;

// Shared app layout constants already used in navigation/components.
export const CUSTOM_TAB_BAR_HEIGHT = 72;
export const HOME_TITLE_SUBTITLE_GAP = TITLE_TO_SUBTITLE_GAP;
export const HOME_SUBTITLE_TO_STAT_GAP = SUBTITLE_TO_MAINCARD_GAP;
export const CARD_PADDING_LG = 15;
export const CARD_PADDING_MD = 13;
export const TAB_BAR_INSET_X = SCREEN_PAD_X;
export const SCREEN_SAFE_TOP_EXTRA = 12;
export const SCREEN_SAFE_BOTTOM_EXTRA = 12;

// Backward-compatible aliases for existing imports.
export const screenPaddingX = SCREEN_PAD_X;
export const homeCardGap = GAP_HOME_SECTION;
export const profileRowGap = GAP_PROFILE_ROWS;
export const sectionGap = GAP_PROFILE_SECTION;
export const cardPaddingLg = CARD_PADDING_LG;
export const cardPaddingMd = CARD_PADDING_MD;
export const tabBarInsetX = TAB_BAR_INSET_X;
export const customTabBarHeight = CUSTOM_TAB_BAR_HEIGHT;
export const homeTitleSubtitleGap = HOME_TITLE_SUBTITLE_GAP;
export const homeSubtitleToStatGap = HOME_SUBTITLE_TO_STAT_GAP;
export const screenSafeTopExtra = SCREEN_SAFE_TOP_EXTRA;
export const screenSafeBottomExtra = SCREEN_SAFE_BOTTOM_EXTRA;
