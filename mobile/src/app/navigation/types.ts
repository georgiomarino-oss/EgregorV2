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
  CommunityHome: undefined;
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
