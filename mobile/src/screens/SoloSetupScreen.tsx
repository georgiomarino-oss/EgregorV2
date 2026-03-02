import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { profileRowGap, sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

type SoloSetupNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloSetup'>;
type SoloSetupRoute = RouteProp<SoloStackParamList, 'SoloSetup'>;

function SetupStat({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard radius="md" style={styles.setupStat}>
      <Typography color={colors.textSecondary} variant="Label">
        {label}
      </Typography>
      <Typography variant="H2" weight="bold">
        {value}
      </Typography>
    </SurfaceCard>
  );
}

export function SoloSetupScreen() {
  const navigation = useNavigation<SoloSetupNavigation>();
  const route = useRoute<SoloSetupRoute>();

  const intention = route.params?.intention?.trim() || 'peace, healing, and grounded courage';

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="solo">
      <Typography variant="H1" weight="bold">
        Intentional solo ritual
      </Typography>
      <Typography color={colors.textSecondary}>
        Setup flow is simplified for quick starts while preserving depth.
      </Typography>

      <SurfaceCard radius="xl" style={styles.section}>
        <Typography color={colors.textSecondary} variant="Label">
          Intention
        </Typography>
        <Typography variant="H2">{intention}</Typography>

        <View style={styles.row}>
          <SetupStat label="Duration" value="5 min" />
          <SetupStat label="Breath mode" value="Deep" />
        </View>

        <View style={styles.row}>
          <SetupStat label="Ambient" value="Bowls" />
          <SetupStat label="Voice" value="Enabled" />
        </View>

        <Button
          onPress={() => {
            const nextParams: NonNullable<SoloStackParamList['SoloLive']> = { intention };

            if (route.params?.scriptPreset) {
              nextParams.scriptPreset = route.params.scriptPreset;
            }

            navigation.navigate('SoloLive', nextParams);
          }}
          title="Start solo session"
          variant="gold"
        />
      </SurfaceCard>

      <SurfaceCard radius="sm" style={styles.section}>
        <Typography variant="H2" weight="bold">
          Personalized AI lines ready
        </Typography>
        <Typography color={colors.textSecondary}>
          2 of 2 daily free generations remaining.
        </Typography>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  row: {
    flexDirection: 'row',
    gap: sectionGap,
  },
  section: {
    gap: sectionGap,
  },
  setupStat: {
    flex: 1,
    gap: profileRowGap,
  },
});
