import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Sora_400Regular, Sora_500Medium, Sora_700Bold } from '@expo-google-fonts/sora';
import { DarkTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography } from '../components/Typography';
import { envValidation } from '../lib/env';
import { colors } from '../theme/tokens';
import { MissingEnvScreen } from '../screens/MissingEnvScreen';
import { AuthGate } from './navigation/AuthGate';
import type { CaptureNavigationTarget, RootStackParamList } from './navigation/types';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgHomeEnd,
    border: colors.borderSoft,
    card: colors.bgHomeStart,
    notification: colors.danger,
    primary: colors.accentMintStart,
    text: colors.textPrimary,
  },
};

const linking: LinkingOptions<RootStackParamList> = {
  config: {
    screens: {
      Auth: 'auth',
      MainTabs: {
        screens: {
          CommunityTab: {
            screens: {
              CommunityHome: 'community',
              EventsCircle: 'community/events-circle',
              PrayerCircle: 'community/prayer-circle',
            },
          },
          EventsTab: {
            screens: {
              EventDetails: {
                parse: {
                  eventId: (value: string) => value,
                  eventTemplateId: (value: string) => value,
                },
                path: 'events/details',
              },
              EventRoom: {
                parse: {
                  allowAudioGeneration: (value: string) => value === 'true',
                  durationMinutes: (value: string) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  },
                  eventId: (value: string) => value,
                  eventSource: (value: string) =>
                    value === 'news' || value === 'template' ? value : undefined,
                  eventTemplateId: (value: string) => value,
                  eventTitle: (value: string) => value,
                  occurrenceKey: (value: string) => value,
                  scheduledStartAt: (value: string) => value,
                  scriptText: (value: string) => value,
                },
                path: 'events/room',
              },
              EventsHome: 'events',
            },
          },
          ProfileTab: {
            screens: {
              ProfileHome: 'profile',
            },
          },
          SoloTab: {
            screens: {
              PrayerLibrary: 'solo/library',
              SoloHome: 'solo',
              SoloLive: {
                parse: {
                  allowAudioGeneration: (value: string) => value === 'true',
                  durationMinutes: (value: string) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  },
                  intention: (value: string) => value,
                  prayerLibraryItemId: (value: string) => value,
                  scriptPreset: (value: string) => value,
                  sharedSessionId: (value: string) => value,
                },
                path: 'solo/live',
              },
              SoloSetup: {
                parse: {
                  allowAudioGeneration: (value: string) => value === 'true',
                  durationMinutes: (value: string) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  },
                  intention: (value: string) => value,
                  prayerLibraryItemId: (value: string) => value,
                  scriptPreset: (value: string) => value,
                },
                path: 'solo/setup',
              },
            },
          },
        },
      },
    },
  },
  prefixes: ['egregorv2://'],
};

interface AppRootProps {
  captureTarget?: CaptureNavigationTarget;
}

export function AppRoot({ captureTarget }: AppRootProps) {
  const [continueWithoutOptionalEnv, setContinueWithoutOptionalEnv] = useState(false);
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accentMintStart} size="large" />
        <Typography color={colors.textSecondary}>Loading cosmic UI...</Typography>
      </View>
    );
  }

  if (
    envValidation.hasBlockingIssues ||
    (!continueWithoutOptionalEnv && envValidation.missingOptional.length > 0)
  ) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <MissingEnvScreen
          missingOptional={envValidation.missingOptional}
          missingRequired={envValidation.missingRequired}
          onContinueWithoutOptional={() => setContinueWithoutOptionalEnv(true)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <StatusBar style="light" />
        <AuthGate {...(captureTarget ? { captureTarget } : {})} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.bgHomeStart,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
});
