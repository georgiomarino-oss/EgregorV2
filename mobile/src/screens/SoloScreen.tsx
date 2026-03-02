import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import type { SoloStackParamList } from '../app/navigation/types';
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
  const [intention, setIntention] = useState(
    'peace and grounded courage for my family and community',
  );

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Set your daily intention
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          One phrase calibrates your home feed, room suggestions, and solo scripts.
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
              Healing
            </Typography>
          </SurfaceCard>
          <SurfaceCard radius="sm" style={styles.metaCard} variant="homeAlert">
            <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
              Duration
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
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
