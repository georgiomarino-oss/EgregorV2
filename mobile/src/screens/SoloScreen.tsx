import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import type { SoloStackParamList } from '../app/navigation/types';
import { fetchLatestIntention, fetchUserPreferences, saveIntention } from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import {
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { cardPaddingMd } from '../theme/layout';
import { colors, radii, typography } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloHome'>;

export function SoloScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const [userId, setUserId] = useState<string | null>(null);
  const [intention, setIntention] = useState('');
  const [preferredMinutes, setPreferredMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          throw new Error(userError?.message || 'Could not load current user.');
        }

        const nextUserId = data.user.id;
        if (!active) {
          return;
        }

        setUserId(nextUserId);
        const [latestIntention, preferences] = await Promise.all([
          fetchLatestIntention(nextUserId),
          fetchUserPreferences(nextUserId),
        ]);

        if (!active) {
          return;
        }

        setIntention(latestIntention);
        setPreferredMinutes(preferences.preferredSessionMinutes);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load solo setup.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  const focusLabel = useMemo(() => {
    const normalized = intention.trim();
    if (!normalized) {
      return 'Add intention';
    }
    const firstWord = normalized.split(/\s+/)[0] ?? '';
    if (!firstWord) {
      return 'Focus';
    }
    return firstWord.slice(0, 1).toUpperCase() + firstWord.slice(1).toLowerCase();
  }, [intention]);

  const onContinue = async () => {
    const normalizedIntention = intention.trim();
    if (!normalizedIntention || !userId) {
      return;
    }

    setSaving(true);
    try {
      await saveIntention(userId, normalizedIntention);
      setError(null);
      navigation.navigate('SoloSetup', { intention: normalizedIntention });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save intention.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Set your daily intention
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          This intention shapes your solo script and event recommendations.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={styles.section} variant="welcomeMain">
        <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
          Today I choose
        </Typography>
        <TextInput
          multiline
          onChangeText={setIntention}
          placeholder="Type your intention"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={intention}
        />

        <View style={styles.row}>
          <SurfaceCard radius="sm" style={styles.metaCard} variant="homeAlert">
            <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
              Focus
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {loading ? '...' : focusLabel}
            </Typography>
          </SurfaceCard>
          <SurfaceCard radius="sm" style={styles.metaCard} variant="homeAlert">
            <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
              Preferred duration
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {loading ? '...' : `${preferredMinutes} min`}
            </Typography>
          </SurfaceCard>
        </View>

        {loading ? <ActivityIndicator color={colors.accentMintStart} /> : null}
        {error ? (
          <Typography allowFontScaling={false} color={colors.danger} variant="Caption">
            {error}
          </Typography>
        ) : null}

        <Button
          disabled={!intention.trim() || loading}
          loading={saving}
          onPress={() => void onContinue()}
          title="Continue"
          variant="primary"
        />
        <Button
          onPress={() => navigation.navigate('PrayerLibrary')}
          title="Prayer Library"
          variant="secondary"
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  input: {
    backgroundColor: figmaV2Reference.inputs.auth.background,
    borderColor: figmaV2Reference.inputs.auth.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: figmaV2Reference.inputs.auth.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.body,
    minHeight: 74,
    padding: cardPaddingMd,
    textAlignVertical: 'top',
  },
  metaCard: {
    flex: 1,
    gap: PROFILE_ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: PROFILE_SECTION_GAP,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
  },
});
