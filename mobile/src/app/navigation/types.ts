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
  SoloLive: { intention?: string; scriptPreset?: string } | undefined;
  SoloSetup: { intention?: string; scriptPreset?: string } | undefined;
};

export type CommunityStackParamList = {
  CommunityHome: undefined;
  EventsCircle: undefined;
  PrayerCircle: undefined;
};

export type EventsStackParamList = {
  EventDetails: { eventId?: string; eventTemplateId?: string } | undefined;
  EventRoom: { eventId?: string; eventTitle?: string } | undefined;
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
