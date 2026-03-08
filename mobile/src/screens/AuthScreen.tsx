import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../components/AppButtons';
import { Badge } from '../components/Badge';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { TextField } from '../components/TextField';
import { Typography } from '../components/Typography';
import { MOBILE_ANALYTICS_EVENTS, trackMobileEvent } from '../lib/observability';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';
import { colors, spacing } from '../theme/tokens';

type AuthMode = 'signIn' | 'signUp';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSignIn = mode === 'signIn';

  useEffect(() => {
    trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_ENTRY_VIEWED, {
      mode,
    });
  }, [mode]);

  const onSubmit = async () => {
    setMessage(null);
    setLoading(true);
    trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_STARTED, {
      mode,
    });

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
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_FAILED, {
            mode,
          });
          setMessage(error.message);
          return;
        }

        trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_SUCCEEDED, {
          mode,
        });
        setMessage(null);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) {
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_FAILED, {
            mode,
          });
          setMessage(error.message);
          return;
        }

        if (data.session) {
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_SUCCEEDED, {
            mode,
          });
          setMessage(null);
          return;
        }

        trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_SUBMIT_SUCCEEDED, {
          mode,
          requires_confirmation: true,
        });
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
          <Badge label={isSignIn ? 'Returning member' : 'New account'} tone="active" />
          <Typography color={colors.textSecondary} style={styles.subtitle} variant="Body">
            {isSignIn
              ? 'Sign in to continue your live rooms and solo rituals.'
              : 'Create your account to begin solo rituals and shared live rooms.'}
          </Typography>
        </View>

        <SurfaceCard radius="xl" style={styles.card} variant="authForm">
          <View style={styles.form}>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />

            <TextField
              autoCapitalize="none"
              autoComplete="password"
              label="Password"
              onChangeText={setPassword}
              placeholder="********"
              secureTextEntry
              value={password}
            />
          </View>

          {message ? (
            <Typography color={colors.textSecondary} style={styles.message} variant="Caption">
              {message}
            </Typography>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              loading={loading}
              onPress={onSubmit}
              title={isSignIn ? 'Sign in' : 'Sign up'}
            />
            <SecondaryButton
              onPress={() => {
                const nextMode = isSignIn ? 'signUp' : 'signIn';
                trackMobileEvent(MOBILE_ANALYTICS_EVENTS.AUTH_MODE_SWITCHED, {
                  from_mode: mode,
                  to_mode: nextMode,
                });
                setMode(nextMode);
              }}
              title={isSignIn ? 'Create account' : 'Back to sign in'}
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
