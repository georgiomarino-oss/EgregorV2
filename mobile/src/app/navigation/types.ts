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
        durationMinutes?: number;
        intention?: string;
        prayerLibraryItemId?: string;
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
  eventsRoute?: keyof EventsStackParamList;
  root?: 'auth' | 'main';
  profileRoute?: keyof ProfileStackParamList;
  soloRoute?: keyof SoloStackParamList;
  tab?: keyof MainTabParamList;
}
