export const SUPPORT_WEB_URL = 'https://egregor.world/support';
export const PRIVACY_WEB_URL = 'https://egregor.world/privacy';
export const ACCOUNT_DELETION_WEB_URL = 'https://egregor.world/account-deletion';

export type SupportRouteSource = 'account_deletion' | 'moderation_report';

export type SupportRouteSurface =
  | 'circle_details'
  | 'event_details'
  | 'event_room'
  | 'invite_decision'
  | 'profile';

export function buildSupportRouteMetadata(input: {
  source: SupportRouteSource;
  surface: SupportRouteSurface;
}) {
  return {
    supportMetadata: {
      source: input.source,
      surface: input.surface,
      supportUrl: SUPPORT_WEB_URL,
    },
    supportRoute: SUPPORT_WEB_URL,
  };
}
