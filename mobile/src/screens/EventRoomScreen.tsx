import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { homeCardGap, sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type EventRoomRoute = RouteProp<EventsStackParamList, 'EventRoom'>;

export function EventRoomScreen() {
  const route = useRoute<EventRoomRoute>();
  const [joined, setJoined] = useState(652);

  const energyPercent = useMemo(() => {
    const normalized = Math.min(100, Math.round((joined / 900) * 100));
    return Math.max(10, normalized);
  }, [joined]);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="eventRoom"
    >
      <Typography variant="H1" weight="bold">
        Reactive event field
      </Typography>
      <Typography color={colors.textSecondary}>
        Live background intensity scales with join behavior to create collective momentum.
      </Typography>

      <SurfaceCard radius="xl" style={styles.section} variant="eventRoomCurrent">
        <Typography color={colors.textLabel} variant="Label">
          Current room
        </Typography>
        <Typography variant="H2" weight="bold">
          {route.params?.eventTitle ?? 'Global healing for displaced families'}
        </Typography>
        <Typography color={figmaV2Reference.text.bodyStrong}>
          Presence energy responds to participant velocity and active focus.
        </Typography>

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[
              figmaV2Reference.eventRoom.progressFillFrom,
              figmaV2Reference.eventRoom.progressFillTo,
            ]}
            end={{ x: 1, y: 0 }}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            style={[styles.progressFill, { width: `${energyPercent}%` }]}
          />
        </View>

        <View style={styles.joinRow}>
          <Typography variant="H2" weight="bold">
            {`${joined} joined live`}
          </Typography>
          <Pressable
            onPress={() => setJoined((prev) => prev + 1)}
            style={({ pressed }) => [styles.simulateButton, pressed && styles.simulatePressed]}
          >
            <Typography
              color={figmaV2Reference.eventRoom.miniButtonText}
              style={styles.simulateText}
              variant="Caption"
            >
              Simulate join +1
            </Typography>
          </Pressable>
        </View>
      </SurfaceCard>

      <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
        <Typography variant="H2" weight="bold">
          Adaptive visual states
        </Typography>
        <Typography color={colors.textCaption} variant="Caption">
          Low energy = calm aura, high energy = brighter pulse and gold lift.
        </Typography>
      </SurfaceCard>

      <Button onPress={() => null} title="Enter synchronized breathing" variant="gold" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  joinRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  progressFill: {
    borderRadius: radii.pill,
    flex: 1,
  },
  progressTrack: {
    borderColor: figmaV2Reference.eventRoom.progressTrackBorder,
    borderRadius: radii.pill,
    borderWidth: 0.8,
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    padding: 1,
  },
  section: {
    gap: homeCardGap,
  },
  simulateButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.eventRoom.miniButtonBackground,
    borderColor: figmaV2Reference.eventRoom.miniButtonBorder,
    borderRadius: 10,
    borderWidth: 0.8,
    height: 34,
    justifyContent: 'center',
    minWidth: 134.075,
    paddingHorizontal: 10,
  },
  simulatePressed: {
    transform: [{ scale: 0.99 }],
  },
  simulateText: {
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
});
