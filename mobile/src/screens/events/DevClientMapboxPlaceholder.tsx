import { ScrollView, StyleSheet } from 'react-native';

import { SurfaceCard } from '../../components/SurfaceCard';
import { Typography } from '../../components/Typography';
import { colors, eventMarkerColors, spacing } from '../../lib/theme/tokens';
import type { EventItem, PresenceUser } from './data';

interface DevClientMapboxPlaceholderProps {
  events: EventItem[];
  hasMapboxModule: boolean;
  hasMapboxToken: boolean;
  presenceUsers: PresenceUser[];
}

export function DevClientMapboxPlaceholder({
  events,
  hasMapboxModule,
  hasMapboxToken,
  presenceUsers,
}: DevClientMapboxPlaceholderProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Typography variant="hero" weight="display">
        Events Map (Dev Client)
      </Typography>
      <Typography>
        Dev-client structure is ready. Install and wire `@rnmapbox/maps` before enabling live map
        rendering.
      </Typography>

      <SurfaceCard style={styles.section}>
        <Typography variant="title" weight="display">
          Integration Status
        </Typography>
        <Typography color={hasMapboxModule ? eventMarkerColors.user : colors.danger}>
          {`Mapbox module: ${hasMapboxModule ? 'loaded' : 'not loaded'}`}
        </Typography>
        <Typography color={hasMapboxToken ? eventMarkerColors.user : colors.danger}>
          {`Mapbox token: ${hasMapboxToken ? 'configured' : 'missing'}`}
        </Typography>
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <Typography variant="title" weight="display">
          Marker Payload Preview
        </Typography>
        {events.map((event) => (
          <Typography key={event.id} variant="caption">
            {`${event.status.toUpperCase()} • ${event.title} (${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)})`}
          </Typography>
        ))}
        {presenceUsers.map((user) => (
          <Typography key={user.id} color={eventMarkerColors.user} variant="caption">
            {`USER • ${user.name} (${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)})`}
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
  section: {
    gap: spacing.sm,
  },
});
