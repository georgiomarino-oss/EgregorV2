import { View } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CommunityScreen } from '../../screens/CommunityScreen';
import { EventsScreen } from '../../screens/EventsScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { SoloScreen } from '../../screens/SoloScreen';
import { colors, spacing, typography } from '../../lib/theme/tokens';
import type {
  CommunityStackParamList,
  EventsStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
  SoloStackParamList,
} from './types';
import { AuthScreen } from '../../screens/AuthScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const SoloStack = createNativeStackNavigator<SoloStackParamList>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const sharedStackOptions = {
  contentStyle: {
    backgroundColor: colors.backgroundTop,
  },
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: 'rgba(6, 10, 24, 0.96)',
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    color: colors.textPrimary,
    fontFamily: typography.family.display,
    fontSize: typography.size.bodyLg,
  },
};

function DotIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: 999,
        height: 8,
        width: 8,
      }}
    />
  );
}

function SoloStackNavigator() {
  return (
    <SoloStack.Navigator screenOptions={sharedStackOptions}>
      <SoloStack.Screen name="SoloHome" component={SoloScreen} options={{ title: 'Solo' }} />
    </SoloStack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={sharedStackOptions}>
      <CommunityStack.Screen
        name="CommunityHome"
        component={CommunityScreen}
        options={{ title: 'Community' }}
      />
    </CommunityStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={sharedStackOptions}>
      <EventsStack.Screen
        name="EventsHome"
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
    </EventsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={sharedStackOptions}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.auroraPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color }) => <DotIcon color={color} />,
        tabBarStyle: {
          backgroundColor: 'rgba(5, 10, 26, 0.95)',
          borderTopColor: 'rgba(86, 116, 206, 0.2)',
          height: 72,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
        },
        tabBarLabelStyle: {
          fontFamily: typography.family.bodySemibold,
          fontSize: 12,
          letterSpacing: 0.3,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.backgroundTop,
        },
        tabBarTestID: `${route.name}-tab`,
      })}
    >
      <Tab.Screen name="SoloTab" component={SoloStackNavigator} options={{ title: 'Solo' }} />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityStackNavigator}
        options={{ title: 'Community' }}
      />
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
