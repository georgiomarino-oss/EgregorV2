export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  SoloTab: undefined;
  CommunityTab: undefined;
  EventsTab: undefined;
  ProfileTab: undefined;
};

export type SoloStackParamList = {
  PrayerLibrary: undefined;
  SoloHome: undefined;
  SoloLive:
    | {
        allowAudioGeneration?: boolean;
        captureSharedRole?: 'host' | 'participant';
        durationMinutes?: number;
        intention?: string;
        prayerLibraryItemId?: string;
        sharedSessionId?: string;
        scriptPreset?: string;
      }
    | undefined;
  SoloSetup:
    | {
        allowAudioGeneration?: boolean;
        durationMinutes?: number;
        intention?: string;
        prayerLibraryItemId?: string;
        scriptPreset?: string;
      }
    | undefined;
};

export type CommunityStackParamList = {
  CircleDetails: { circleId: string; circleName?: string } | undefined;
  CircleInviteComposer: { circleId: string; circleName?: string };
  CommunityHome: undefined;
  InviteDecision:
    | {
        invitationId?: string;
        inviteToken?: string;
      }
    | undefined;
  EventsCircle: undefined;
  PrayerCircle: undefined;
};

export type EventsStackParamList = {
  EventDetails: { eventId?: string; eventTemplateId?: string } | undefined;
  EventRoom:
    | {
        allowAudioGeneration?: boolean;
        durationMinutes?: number;
        eventId?: string;
        eventSource?: 'news' | 'template';
        eventTemplateId?: string;
        eventTitle?: string;
        occurrenceKey?: string;
        scheduledStartAt?: string;
        scriptText?: string;
      }
    | undefined;
  EventsHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
};

export interface CaptureNavigationTarget {
  communityParams?:
    | CommunityStackParamList['CircleDetails']
    | CommunityStackParamList['CircleInviteComposer']
    | CommunityStackParamList['InviteDecision'];
  communityRoute?: keyof CommunityStackParamList;
  eventDetailsParams?: EventsStackParamList['EventDetails'];
  eventRoomParams?: EventsStackParamList['EventRoom'];
  eventsRoute?: keyof EventsStackParamList;
  root?: 'auth' | 'entry' | 'main' | 'missingEnv';
  profileRoute?: keyof ProfileStackParamList;
  soloParams?: SoloStackParamList['SoloLive'];
  soloRoute?: keyof SoloStackParamList;
  tab?: keyof MainTabParamList;
}
