import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, radii, spacing, typography } from '../theme/tokens';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoiding}
    >
      <Screen
        ambientSource={ambientAnimation}
        contentContainerStyle={styles.scrollContent}
        scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        topOffset={6}
        variant="auth"
        withTabBarInset={false}
      >
        <View style={styles.header}>
          <LiveLogo size={82} style={styles.logo} />
          <Typography variant="H1" weight="bold">
            Enter the collective field
          </Typography>
          <Typography color={colors.textSecondary} style={styles.subtitle} variant="Body">
            Sign in to join live healing rooms and personalized solo rituals.
          </Typography>
        </View>

        <SurfaceCard radius="xl" style={styles.card} variant="authForm">
          <View style={styles.form}>
            <Typography variant="Label">Email</Typography>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={email}
            />

            <Typography variant="Label">Password</Typography>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {message ? (
            <Typography color={colors.textSecondary} style={styles.message} variant="Caption">
              {message}
            </Typography>
          ) : null}

          <View style={styles.actions}>
            <Button loading={loading} onPress={onSubmit} title={isSignIn ? 'Sign in' : 'Sign up'} />
            <Button
              onPress={() => setMode(isSignIn ? 'signUp' : 'signIn')}
              title={isSignIn ? 'Create account' : 'Back to sign in'}
              variant="secondary"
            />
          </View>
        </SurfaceCard>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    gap: sectionGap,
    paddingBottom: spacing.md,
  },
  form: {
    gap: spacing.sm,
  },
  header: {
    gap: spacing.sm,
    marginBottom: sectionGap,
  },
  input: {
    backgroundColor: figmaV2Reference.inputs.auth.background,
    borderColor: figmaV2Reference.inputs.auth.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: figmaV2Reference.inputs.auth.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.body,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    paddingHorizontal: spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    gap: sectionGap,
    justifyContent: 'flex-start',
    paddingBottom: sectionGap,
    paddingTop: sectionGap,
  },
  subtitle: {
    maxWidth: 460,
  },
});
