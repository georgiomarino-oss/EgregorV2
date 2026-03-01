import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { colors, spacing } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard radius="sm" style={styles.statCard} variant="homeStatSmall">
      <Typography color={colors.textSecondary} variant="Label">
        {label}
      </Typography>
      <Typography variant="H2" weight="bold">
        {value}
      </Typography>
    </SurfaceCard>
  );
}

export function EventDetailsScreen() {
  const navigation = useNavigation<EventsNavigation>();

  return (
    <CosmicBackground ambientSource={ambientAnimation} variant="events">
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="H1" weight="bold">
          Madrid flood response
        </Typography>
        <Typography color={colors.textSecondary}>
          High-coherence emergency room coordinating prayer and aid focus.
        </Typography>

        <SurfaceCard radius="xl" style={styles.section} variant="eventRoomCurrent">
          <View style={styles.row}>
            <StatCard label="Starts" value="Live now" />
            <StatCard label="Participants" value="652" />
          </View>
          <View style={styles.row}>
            <StatCard label="Duration" value="20 min" />
            <StatCard label="Region" value="Europe" />
          </View>

          <Button
            onPress={() =>
              navigation.navigate('EventRoom', {
                eventId: 'event-1',
                eventTitle: 'Madrid flood response',
              })
            }
            title="Join live room"
            variant="gold"
          />
        </SurfaceCard>

        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            Host note
          </Typography>
          <Typography color={colors.textSecondary}>
            Hold families in safety, strength, and coordinated care.
          </Typography>
        </SurfaceCard>

        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography variant="H2" weight="bold">
            Access
          </Typography>
          <Typography color={colors.textSecondary}>
            Public room. Friends can be invited after join.
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
  },
});
