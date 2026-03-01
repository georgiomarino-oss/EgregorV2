import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { colors, spacing } from '../theme/tokens';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNavigation>();

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="home">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Global pulse
        </Typography>
        <Typography color={colors.textSecondary}>
          Live awareness feed with fast path into active healing rooms.
        </Typography>

        <SurfaceCard radius="xl" style={styles.section} variant="homeStat">
          <Typography variant="Metric" weight="bold">
            1,942
          </Typography>
          <Typography color={colors.textSecondary} variant="Label">
            Active participants in this hour
          </Typography>

          <View style={styles.row}>
            <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
              <Typography color={colors.textSecondary} variant="Label">
                Live events
              </Typography>
              <Typography variant="H2" weight="bold">
                14
              </Typography>
            </SurfaceCard>
            <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
              <Typography color={colors.textSecondary} variant="Label">
                Countries
              </Typography>
              <Typography variant="H2" weight="bold">
                31
              </Typography>
            </SurfaceCard>
          </View>

          <Button
            onPress={() => navigation.navigate('CommunityHome')}
            title="Join strongest live room"
            variant="primary"
          />
        </SurfaceCard>

        <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            Fast rise detected: Lisbon flood response
          </Typography>
          <Typography color={colors.textSecondary}>
            +83 joins in 5 min. Estimated coherence window: now
          </Typography>
        </SurfaceCard>

        <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            Your circle room opens in 9 min
          </Typography>
          <Typography color={colors.textSecondary}>
            24 waiting. You are host in this session.
          </Typography>
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
  feedCard: {
    gap: spacing.xs,
  },
  metricCard: {
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
