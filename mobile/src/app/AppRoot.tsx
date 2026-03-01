import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography } from '../components/Typography';
import { envValidation } from '../lib/env';
import { colors } from '../lib/theme/tokens';
import { MissingEnvScreen } from '../screens/MissingEnvScreen';
import { AuthGate } from './navigation/AuthGate';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.backgroundTop,
    border: colors.border,
    card: colors.backgroundBottom,
    notification: colors.danger,
    primary: colors.auroraPrimary,
    text: colors.textPrimary,
  },
};

export function AppRoot() {
  const [continueWithoutOptionalEnv, setContinueWithoutOptionalEnv] = useState(false);
  const [fontsLoaded] = useFonts({
    CormorantGaramond_700Bold,
    CormorantGaramond_700Bold_Italic,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.auroraPrimary} size="large" />
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
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" />
        <AuthGate />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.backgroundTop,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
});
