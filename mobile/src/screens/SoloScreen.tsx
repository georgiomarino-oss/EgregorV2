import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import type { SoloStackParamList } from '../app/navigation/types';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { colors, radii, spacing, typography } from '../theme/tokens';

type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloHome'>;

export function SoloScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const [intention, setIntention] = useState(
    'peace and grounded courage for my family and community',
  );

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="solo">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Set your daily intention
        </Typography>
        <Typography color={colors.textSecondary}>
          One phrase calibrates your home feed, room suggestions, and solo scripts.
        </Typography>

        <SurfaceCard radius="xl" style={styles.section}>
          <Typography variant="Label">Today I choose</Typography>
          <TextInput
            multiline
            onChangeText={setIntention}
            placeholder="Type your intention"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={intention}
          />

          <View style={styles.row}>
            <SurfaceCard radius="sm" style={styles.metaCard} variant="homeStatSmall">
              <Typography color={colors.textSecondary} variant="Label">
                Focus
              </Typography>
              <Typography variant="H2" weight="bold">
                Healing
              </Typography>
            </SurfaceCard>
            <SurfaceCard radius="sm" style={styles.metaCard} variant="homeStatSmall">
              <Typography color={colors.textSecondary} variant="Label">
                Duration
              </Typography>
              <Typography variant="H2" weight="bold">
                30 sec setup
              </Typography>
            </SurfaceCard>
          </View>

          <Button
            onPress={() => navigation.navigate('SoloSetup', { intention })}
            title="Continue"
            variant="primary"
          />
          <Button
            onPress={() => navigation.navigate('PrayerLibrary')}
            title="Prayer Library"
            variant="secondary"
          />
        </SurfaceCard>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
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
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  metaCard: {
    flex: 1,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
});
