export const SUPPORT_WEB_URL = 'https://egregor.world/support';
export const PRIVACY_WEB_URL = 'https://egregor.world/privacy';
export const ACCOUNT_DELETION_WEB_URL = 'https://egregor.world/account-deletion';

export function buildSupportRouteMetadata(input: {
  source: 'account_deletion' | 'moderation_report';
  surface: 'event_room' | 'profile';
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
