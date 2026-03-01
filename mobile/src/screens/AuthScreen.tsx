import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '../components/Buttons';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing, typography } from '../lib/theme/tokens';

type AuthMode = 'signIn' | 'signUp';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSignIn = mode === 'signIn';

  const onSubmit = async () => {
    setMessage(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        setMessage('Email and password are required.');
        return;
      }

      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage(null);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setMessage(null);
          return;
        }

        setMessage('Account created. Check your inbox to confirm your email before signing in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <CosmicBackground ambientSource={ambientAnimation}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Typography variant="hero" weight="display">
              Egregor v2
            </Typography>
            <Typography color={colors.textSecondary} style={styles.subtitle}>
              Gather intention. Share prayer. Manifest together.
            </Typography>
          </View>

          <SurfaceCard style={styles.card}>
            <View style={styles.modeRow}>
              <AppButton
                onPress={() => setMode('signIn')}
                title="Sign In"
                variant={isSignIn ? 'primary' : 'secondary'}
              />
              <AppButton
                onPress={() => setMode('signUp')}
                title="Sign Up"
                variant={isSignIn ? 'secondary' : 'primary'}
              />
            </View>

            <View style={styles.form}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={email}
              />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {message ? (
              <Typography color={colors.textSecondary} style={styles.message} variant="caption">
                {message}
              </Typography>
            ) : null}

            <AppButton
              loading={loading}
              onPress={onSubmit}
              title={isSignIn ? 'Enter Circle' : 'Create Account'}
              variant="primary"
            />
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(14, 22, 48, 0.86)',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.family.body,
    fontSize: typography.size.body,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  message: {
    paddingHorizontal: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  subtitle: {
    maxWidth: 420,
  },
});
