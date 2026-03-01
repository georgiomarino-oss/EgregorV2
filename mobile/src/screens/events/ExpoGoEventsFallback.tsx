import globeFallbackAnimation from '../../../assets/lottie/globe-fallback.json';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import LottieView from 'lottie-react-native';

import { SurfaceCard } from '../../components/SurfaceCard';
import { Typography } from '../../components/Typography';
import { eventMarkerColors, spacing } from '../../lib/theme/tokens';
import type { EventItem, PresenceUser } from './data';

interface ExpoGoEventsFallbackProps {
  events: EventItem[];
  locationMessage: string;
  presenceUsers: PresenceUser[];
  userLocation: { latitude: number; longitude: number } | null;
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function ExpoGoEventsFallback({
  events,
  locationMessage,
  presenceUsers,
  userLocation,
}: ExpoGoEventsFallbackProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Typography variant="hero" weight="display">
        Events
      </Typography>
      <Typography>{locationMessage}</Typography>

      <SurfaceCard style={styles.globeCard}>
        <LottieView autoPlay loop source={globeFallbackAnimation} style={styles.globeAnimation} />
      </SurfaceCard>

      <SurfaceCard style={styles.legendCard}>
        <View style={styles.legendRow}>
          <Dot color={eventMarkerColors.live} />
          <Typography variant="caption">Live events</Typography>
        </View>
        <View style={styles.legendRow}>
          <Dot color={eventMarkerColors.scheduled} />
          <Typography variant="caption">Scheduled events</Typography>
        </View>
        <View style={styles.legendRow}>
          <Dot color={eventMarkerColors.user} />
          <Typography variant="caption">Users / You</Typography>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <Typography variant="title" weight="display">
          Event Feed (Expo Go Fallback)
        </Typography>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLead}>
                <Dot
                  color={
                    item.status === 'live' ? eventMarkerColors.live : eventMarkerColors.scheduled
                  }
                />
                <Typography>{item.title}</Typography>
              </View>
              <Typography variant="caption">{item.startsAt}</Typography>
            </View>
          )}
          scrollEnabled={false}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <Typography variant="title" weight="display">
          Live Presence
        </Typography>
        {userLocation ? (
          <Typography color={eventMarkerColors.user} variant="caption">
            {`You: ${userLocation.latitude.toFixed(3)}, ${userLocation.longitude.toFixed(3)}`}
          </Typography>
        ) : (
          <Typography variant="caption">Your location is not available yet.</Typography>
        )}
        {presenceUsers.map((user) => (
          <Typography key={user.id} color={eventMarkerColors.user} variant="caption">
            {`${user.name}: ${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)}`}
          </Typography>
        ))}
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  globeAnimation: {
    height: 220,
    width: '100%',
  },
  globeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: spacing.md,
  },
  legendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '70%',
  },
  section: {
    gap: spacing.sm,
  },
});
