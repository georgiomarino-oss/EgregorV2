import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
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
  CaptureNavigationTarget,
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

interface SoloStackNavigatorProps {
  initialRouteName?: keyof SoloStackParamList;
}

function SoloStackNavigator({ initialRouteName }: SoloStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  return (
    <SoloStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <SoloStack.Screen name="SoloHome" component={SoloScreen} />
      <SoloStack.Screen name="PrayerLibrary" component={PrayerLibraryScreen} />
      <SoloStack.Screen name="SoloSetup" component={SoloSetupScreen} />
      <SoloStack.Screen name="SoloLive" component={SoloLiveScreen} />
    </SoloStack.Navigator>
  );
}

interface CommunityStackNavigatorProps {
  initialRouteName?: keyof CommunityStackParamList;
}

function CommunityStackNavigator({ initialRouteName }: CommunityStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  return (
    <CommunityStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityScreen} />
    </CommunityStack.Navigator>
  );
}

interface EventsStackNavigatorProps {
  initialRouteName?: keyof EventsStackParamList;
}

function EventsStackNavigator({ initialRouteName }: EventsStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  return (
    <EventsStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <EventsStack.Screen name="EventsHome" component={EventsScreen} />
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <EventsStack.Screen name="EventRoom" component={EventRoomScreen} />
    </EventsStack.Navigator>
  );
}

interface ProfileStackNavigatorProps {
  initialRouteName?: keyof ProfileStackParamList;
}

function ProfileStackNavigator({ initialRouteName }: ProfileStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  return (
    <ProfileStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

interface MainTabsProps {
  captureTarget?: CaptureNavigationTarget;
}

function MainTabs({ captureTarget }: MainTabsProps) {
  const tabNavigatorProps = captureTarget?.tab ? { initialRouteName: captureTarget.tab } : {};

  return (
    <Tab.Navigator
      {...tabNavigatorProps}
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomTabs {...props} />}
    >
      <Tab.Screen
        name="CommunityTab"
        children={() => (
          <CommunityStackNavigator
            {...(captureTarget?.communityRoute
              ? { initialRouteName: captureTarget.communityRoute }
              : {})}
          />
        )}
        options={{ title: 'Community' }}
      />
      <Tab.Screen
        name="SoloTab"
        children={() => (
          <SoloStackNavigator
            {...(captureTarget?.soloRoute ? { initialRouteName: captureTarget.soloRoute } : {})}
          />
        )}
        options={({ route }) => {
          const nestedRouteName = getFocusedRouteNameFromRoute(route) ?? 'SoloHome';
          const hideTabBar = nestedRouteName === 'SoloLive';

          return {
            title: 'Solo',
            ...(hideTabBar ? { tabBarStyle: { display: 'none' } } : {}),
          };
        }}
      />
      <Tab.Screen
        name="EventsTab"
        children={() => (
          <EventsStackNavigator
            {...(captureTarget?.eventsRoute
              ? { initialRouteName: captureTarget.eventsRoute }
              : {})}
          />
        )}
        options={{ title: 'Events' }}
      />
      <Tab.Screen
        name="ProfileTab"
        children={() => (
          <ProfileStackNavigator
            {...(captureTarget?.profileRoute
              ? { initialRouteName: captureTarget.profileRoute }
              : {})}
          />
        )}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

interface RootNavigatorProps {
  captureTarget?: CaptureNavigationTarget;
  isAuthenticated: boolean;
}

export function RootNavigator({ captureTarget, isAuthenticated }: RootNavigatorProps) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="MainTabs">
          {() => <MainTabs {...(captureTarget ? { captureTarget } : {})} />}
        </RootStack.Screen>
      ) : (
        <RootStack.Screen name="Auth" component={AuthScreen} />
      )}
    </RootStack.Navigator>
  );
}
