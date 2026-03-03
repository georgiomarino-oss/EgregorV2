import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Sora_400Regular, Sora_500Medium, Sora_700Bold } from '@expo-google-fonts/sora';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Typography } from '../components/Typography';
import { envValidation } from '../lib/env';
import { colors } from '../theme/tokens';
import { MissingEnvScreen } from '../screens/MissingEnvScreen';
import { AuthGate } from './navigation/AuthGate';
import type { CaptureNavigationTarget } from './navigation/types';

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
      <NavigationContainer theme={navigationTheme}>
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
