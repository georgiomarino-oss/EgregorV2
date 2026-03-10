import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BottomTabs } from '../../components/BottomTabs';
import { AuthScreen } from '../../screens/AuthScreen';
import { CircleDetailsScreen } from '../../screens/CircleDetailsScreen';
import { CircleInviteComposerScreen } from '../../screens/CircleInviteComposerScreen';
import { CommunityScreen } from '../../screens/CommunityScreen';
import { EventDetailsScreen } from '../../screens/EventDetailsScreen';
import { EventRoomScreen } from '../../screens/EventRoomScreen';
import { EventsScreen } from '../../screens/EventsScreen';
import { InviteDecisionScreen } from '../../screens/InviteDecisionScreen';
import { PrayerLibraryScreen } from '../../screens/PrayerLibraryScreen';
import { ProfileScreen, ProfileSettingsScreen } from '../../screens/ProfileScreen';
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
  soloLiveInitialParams?: SoloStackParamList['SoloLive'];
}

function SoloStackNavigator({ initialRouteName, soloLiveInitialParams }: SoloStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  const soloLiveProps = soloLiveInitialParams ? { initialParams: soloLiveInitialParams } : {};
  return (
    <SoloStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <SoloStack.Screen name="SoloHome" component={SoloScreen} />
      <SoloStack.Screen name="PrayerLibrary" component={PrayerLibraryScreen} />
      <SoloStack.Screen name="SoloSetup" component={SoloSetupScreen} />
      <SoloStack.Screen name="SoloLive" component={SoloLiveScreen} {...soloLiveProps} />
    </SoloStack.Navigator>
  );
}

interface CommunityStackNavigatorProps {
  circleDetailsInitialParams?: CommunityStackParamList['CircleDetails'];
  circleInviteComposerInitialParams?: CommunityStackParamList['CircleInviteComposer'];
  initialRouteName?: keyof CommunityStackParamList;
  inviteDecisionInitialParams?: CommunityStackParamList['InviteDecision'];
}

function CommunityStackNavigator({
  circleDetailsInitialParams,
  circleInviteComposerInitialParams,
  initialRouteName,
  inviteDecisionInitialParams,
}: CommunityStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  const circleDetailsProps = circleDetailsInitialParams
    ? { initialParams: circleDetailsInitialParams }
    : {};
  const circleInviteComposerProps = circleInviteComposerInitialParams
    ? { initialParams: circleInviteComposerInitialParams }
    : {};
  const inviteDecisionProps = inviteDecisionInitialParams
    ? { initialParams: inviteDecisionInitialParams }
    : {};
  return (
    <CommunityStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityScreen} />
      <CommunityStack.Screen
        name="CircleDetails"
        component={CircleDetailsScreen}
        {...circleDetailsProps}
      />
      <CommunityStack.Screen
        name="CircleInviteComposer"
        component={CircleInviteComposerScreen}
        {...circleInviteComposerProps}
      />
      <CommunityStack.Screen
        name="InviteDecision"
        component={InviteDecisionScreen}
        {...inviteDecisionProps}
      />
    </CommunityStack.Navigator>
  );
}

interface EventsStackNavigatorProps {
  eventDetailsInitialParams?: EventsStackParamList['EventDetails'];
  eventRoomInitialParams?: EventsStackParamList['EventRoom'];
  initialRouteName?: keyof EventsStackParamList;
}

function EventsStackNavigator({
  eventDetailsInitialParams,
  eventRoomInitialParams,
  initialRouteName,
}: EventsStackNavigatorProps) {
  const navigatorProps = initialRouteName ? { initialRouteName } : {};
  const eventDetailsProps = eventDetailsInitialParams
    ? { initialParams: eventDetailsInitialParams }
    : {};
  const eventRoomProps = eventRoomInitialParams ? { initialParams: eventRoomInitialParams } : {};
  return (
    <EventsStack.Navigator {...navigatorProps} screenOptions={sharedStackOptions}>
      <EventsStack.Screen name="EventsHome" component={EventsScreen} />
      <EventsStack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        {...eventDetailsProps}
      />
      <EventsStack.Screen name="EventRoom" component={EventRoomScreen} {...eventRoomProps} />
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
      <ProfileStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

interface MainTabsProps {
  captureTarget?: CaptureNavigationTarget;
}

function MainTabs({ captureTarget }: MainTabsProps) {
  const tabNavigatorProps = captureTarget?.tab ? { initialRouteName: captureTarget.tab } : {};
  const communityRoute = captureTarget?.communityRoute;
  const communityParams = captureTarget?.communityParams;

  return (
    <Tab.Navigator
      {...tabNavigatorProps}
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomTabs {...props} />}
    >
      <Tab.Screen
        name="SoloTab"
        options={({ route }) => {
          const nestedRouteName = getFocusedRouteNameFromRoute(route) ?? 'SoloHome';
          const hideTabBar = nestedRouteName === 'SoloLive';

          return {
            title: 'Home',
            ...(hideTabBar ? { tabBarStyle: { display: 'none' } } : {}),
          };
        }}
      >
        {() => (
          <SoloStackNavigator
            {...(captureTarget?.soloRoute ? { initialRouteName: captureTarget.soloRoute } : {})}
            {...(captureTarget?.soloParams
              ? { soloLiveInitialParams: captureTarget.soloParams }
              : {})}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="CommunityTab" options={{ title: 'Circles' }}>
        {() => (
          <CommunityStackNavigator
            {...(communityRoute ? { initialRouteName: communityRoute } : {})}
            {...(communityRoute === 'CircleDetails' && communityParams
              ? {
                  circleDetailsInitialParams:
                    communityParams as CommunityStackParamList['CircleDetails'],
                }
              : {})}
            {...(communityRoute === 'CircleInviteComposer' && communityParams
              ? {
                  circleInviteComposerInitialParams:
                    communityParams as CommunityStackParamList['CircleInviteComposer'],
                }
              : {})}
            {...(communityRoute === 'InviteDecision' && communityParams
              ? {
                  inviteDecisionInitialParams:
                    communityParams as CommunityStackParamList['InviteDecision'],
                }
              : {})}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="EventsTab"
        options={({ route }) => {
          const nestedRouteName = getFocusedRouteNameFromRoute(route) ?? 'EventsHome';
          const hideTabBar = nestedRouteName === 'EventRoom';

          return {
            title: 'Live',
            ...(hideTabBar ? { tabBarStyle: { display: 'none' } } : {}),
          };
        }}
      >
        {() => (
          <EventsStackNavigator
            {...(captureTarget?.eventDetailsParams
              ? { eventDetailsInitialParams: captureTarget.eventDetailsParams }
              : {})}
            {...(captureTarget?.eventsRoute ? { initialRouteName: captureTarget.eventsRoute } : {})}
            {...(captureTarget?.eventRoomParams
              ? { eventRoomInitialParams: captureTarget.eventRoomParams }
              : {})}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab" options={{ title: 'Profile' }}>
        {() => (
          <ProfileStackNavigator
            {...(captureTarget?.profileRoute
              ? { initialRouteName: captureTarget.profileRoute }
              : {})}
          />
        )}
      </Tab.Screen>
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
