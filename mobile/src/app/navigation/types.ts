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
};

export type EventsStackParamList = {
  EventDetails:
    | {
        occurrenceId?: string;
        roomId?: string;
      }
    | undefined;
  EventRoom:
    | {
        allowAudioGeneration?: boolean;
        durationMinutes?: number;
        eventTitle?: string;
        occurrenceId?: string;
        occurrenceKey?: string;
        roomId?: string;
        scheduledStartAt?: string;
        scriptText?: string;
      }
    | undefined;
  EventsHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileSettings: undefined;
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
