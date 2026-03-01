import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/Buttons';
import { CosmicBackground } from '../components/CosmicBackground';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { colors, spacing } from '../lib/theme/tokens';

const discoveryItems = [
  'Nearby circles: groups within 50km with active hosts',
  'Open rooms: join live manifestation sessions in one tap',
  'Light feed: short text updates, event invites, and gratitude posts',
] as const;

export function CommunityScreen() {
  return (
    <CosmicBackground ambientSource={ambientAnimation}>
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="hero" weight="display">
          Community
        </Typography>
        <Typography color={colors.textSecondary}>
          MVP recommendation: circles + lightweight feed + room discovery to boost participation.
        </Typography>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            MVP Blueprint
          </Typography>
          {discoveryItems.map((item) => (
            <Typography key={item} color={colors.textSecondary}>
              {`- ${item}`}
            </Typography>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <Typography variant="title" weight="display">
            Suggested Data Model
          </Typography>
          <View style={styles.codeBlock}>
            <Typography variant="caption">circles(id, name, geo, privacy, host_id)</Typography>
            <Typography variant="caption">circle_members(circle_id, user_id, role)</Typography>
            <Typography variant="caption">
              posts(id, circle_id, user_id, body, created_at)
            </Typography>
            <Typography variant="caption">rooms(id, circle_id, status, starts_at)</Typography>
          </View>
          <AppButton
            onPress={() => null}
            title="Join Open Room (Placeholder)"
            variant="secondary"
          />
        </SurfaceCard>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    backgroundColor: 'rgba(7, 13, 29, 0.88)',
    borderRadius: 12,
    gap: spacing.xs,
    padding: spacing.md,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
});
