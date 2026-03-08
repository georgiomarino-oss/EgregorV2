export type SectionThemeMappingKey = 'solo' | 'circles' | 'live' | 'profile';

const routeSectionMap: Record<string, SectionThemeMappingKey> = {
  CommunityTab: 'circles',
  EventsTab: 'live',
  ProfileTab: 'profile',
  SoloTab: 'solo',
};

export function resolveSectionThemeByRoute(routeName: string): SectionThemeMappingKey {
  return routeSectionMap[routeName] ?? 'solo';
}

export function resolveSectionThemeByBackgroundVariant(
  variant: 'auth' | 'circles' | 'eventRoom' | 'events' | 'home' | 'live' | 'profile' | 'solo',
): SectionThemeMappingKey | null {
  if (variant === 'solo') {
    return 'solo';
  }

  if (variant === 'circles' || variant === 'home') {
    return 'circles';
  }

  if (variant === 'live' || variant === 'events' || variant === 'eventRoom') {
    return 'live';
  }

  if (variant === 'profile') {
    return 'profile';
  }

  return null;
}

