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
  ColorSwatch: undefined;
};

export type EventsStackParamList = {
  EventDetails: { eventId?: string } | undefined;
  EventRoom: { eventId?: string; eventTitle?: string } | undefined;
  EventsHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
};
