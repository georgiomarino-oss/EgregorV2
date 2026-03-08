import { StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { PremiumProfileTrustCardSurface } from '../../../components/CinematicPrimitives';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import type { BlockRecord } from '../../../lib/api/safety';
import { profileSurface, radii, spacing } from '../../../theme/tokens';

interface SafetySupportPanelProps {
  blockedUsers: BlockRecord[];
  errorMessage?: string | null;
  infoMessage?: string | null;
  loading: boolean;
  unblockingUserId: string | null;
  onOpenPrivacy: () => void;
  onOpenSupport: () => void;
  onUnblock: (user: BlockRecord) => void;
}

export function SafetySupportPanel({
  blockedUsers,
  errorMessage,
  infoMessage,
  loading,
  unblockingUserId,
  onOpenPrivacy,
  onOpenSupport,
  onUnblock,
}: SafetySupportPanelProps) {
  return (
    <PremiumProfileTrustCardSurface
      fallbackIcon="shield-alert-outline"
      fallbackLabel="Safety and support"
      section="profile"
      style={styles.panel}
    >
      <SectionHeader
        compact
        subtitle="Report and block actions are available in circles, invites, and live surfaces."
        subtitleColor={profileSurface.utility.subtitle}
        title="Safety & Support"
        titleColor={profileSurface.utility.title}
      />

      {loading ? (
        <LoadingStateCard
          compact
          minHeight={120}
          subtitle="Loading your blocked users and support options."
          title="Loading safety settings"
        />
      ) : (
        <>
          <View style={styles.blockedCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              Blocked users
            </Typography>
            {blockedUsers.length === 0 ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                You have not blocked anyone yet.
              </Typography>
            ) : (
              blockedUsers.map((user) => (
                <View key={user.blockedUserId} style={styles.blockedRow}>
                  <View style={styles.blockedTextWrap}>
                    <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
                      {user.blockedDisplayName}
                    </Typography>
                    <Typography color={profileSurface.utility.subtitle} variant="Caption">
                      {user.reason?.trim() || 'No reason captured.'}
                    </Typography>
                  </View>
                  <Button
                    loading={unblockingUserId === user.blockedUserId}
                    onPress={() => {
                      onUnblock(user);
                    }}
                    title="Unblock"
                    variant="ghost"
                  />
                </View>
              ))
            )}
          </View>

          <View style={styles.supportRow}>
            <Button onPress={onOpenSupport} title="Open support" variant="secondary" />
            <Button onPress={onOpenPrivacy} title="Open privacy policy" variant="ghost" />
          </View>
        </>
      )}

      {infoMessage ? (
        <Typography color={profileSurface.utility.subtitle} variant="Caption">
          {infoMessage}
        </Typography>
      ) : null}

      {errorMessage ? (
        <InlineErrorCard message={errorMessage} title="Safety action issue" tone="warning" />
      ) : null}
    </PremiumProfileTrustCardSurface>
  );
}

const styles = StyleSheet.create({
  blockedCard: {
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  blockedRow: {
    alignItems: 'center',
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  blockedTextWrap: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.xs,
  },
  panel: {
    gap: spacing.sm,
  },
  supportRow: {
    gap: spacing.xs,
  },
});

export type { SafetySupportPanelProps };
