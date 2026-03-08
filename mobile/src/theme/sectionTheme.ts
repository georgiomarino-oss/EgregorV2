import type { SectionThemeKey } from './tokens';
import { sectionVisualThemes } from './tokens';
import {
  resolveSectionThemeByBackgroundVariant,
  resolveSectionThemeByRoute,
} from './sectionThemeMapping';

export function getSectionThemeByRoute(routeName: string): SectionThemeKey {
  return resolveSectionThemeByRoute(routeName);
}

export function getSectionThemeByBackgroundVariant(
  variant: 'auth' | 'circles' | 'eventRoom' | 'events' | 'home' | 'live' | 'profile' | 'solo',
): SectionThemeKey | null {
  return resolveSectionThemeByBackgroundVariant(variant);
}

export function getSectionThemePalette(section: SectionThemeKey) {
  return sectionVisualThemes[section];
}
