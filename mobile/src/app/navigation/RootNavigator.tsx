import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BottomTabs } from '../../components/BottomTabs';
import { AuthScreen } from '../../screens/AuthScreen';
import { CommunityScreen } from '../../screens/CommunityScreen';
import { EventDetailsScreen } from '../../screens/EventDetailsScreen';
import { EventRoomScreen } from '../../screens/EventRoomScreen';
import { EventsScreen } from '../../screens/EventsScreen';
import { PrayerLibraryScreen } from '../../screens/PrayerLibraryScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { SoloLiveScreen } from '../../screens/SoloLiveScreen';
import { SoloScreen } from '../../screens/SoloScreen';
import { SoloSetupScreen } from '../../screens/SoloSetupScreen';
import type {
  CommunityStackParamList,
  EventsStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
  SoloStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const SoloStack = createNativeStackNavigator<SoloStackParamList>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const sharedStackOptions = {
  headerShown: false,
};

function SoloStackNavigator() {
  return (
    <SoloStack.Navigator screenOptions={sharedStackOptions}>
      <SoloStack.Screen name="SoloHome" component={SoloScreen} />
      <SoloStack.Screen name="PrayerLibrary" component={PrayerLibraryScreen} />
      <SoloStack.Screen name="SoloSetup" component={SoloSetupScreen} />
      <SoloStack.Screen name="SoloLive" component={SoloLiveScreen} />
    </SoloStack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={sharedStackOptions}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityScreen} />
    </CommunityStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={sharedStackOptions}>
      <EventsStack.Screen name="EventsHome" component={EventsScreen} />
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <EventsStack.Screen name="EventRoom" component={EventRoomScreen} />
    </EventsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={sharedStackOptions}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomTabs {...props} />}
    >
      <Tab.Screen
        name="CommunityTab"
        component={CommunityStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen name="SoloTab" component={SoloStackNavigator} options={{ title: 'Solo' }} />
      <Tab.Screen name="EventsTab" component={EventsStackNavigator} options={{ title: 'Events' }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthScreen} />
      )}
    </RootStack.Navigator>
  );
}
