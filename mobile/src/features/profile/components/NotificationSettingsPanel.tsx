import { StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { PremiumProfileTrustCardSurface } from '../../../components/CinematicPrimitives';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { StatusChip } from '../../../components/StatusChip';
import { Typography } from '../../../components/Typography';
import type { NotificationCategory } from '../../../lib/api/notifications';
import { profileSurface, radii, spacing } from '../../../theme/tokens';
import type {
  NotificationPermissionPresentation,
  ReminderStatePresentation,
} from '../services/accountTrustPresentation';

interface NotificationSettingRow {
  category: NotificationCategory;
  description: string;
  enabled: boolean;
  title: string;
}

interface NotificationSettingsPanelProps {
  errorMessage?: string | null;
  loading: boolean;
  permission: NotificationPermissionPresentation;
  reminderState: ReminderStatePresentation;
  rows: NotificationSettingRow[];
  syncingPermission: boolean;
  updatingCategory: NotificationCategory | null;
  onOpenSettings: () => void;
  onRequestPermission: () => void;
  onToggleCategory: (category: NotificationCategory, enabled: boolean) => void;
}

export function NotificationSettingsPanel({
  errorMessage,
  loading,
  permission,
  reminderState,
  rows,
  syncingPermission,
  updatingCategory,
  onOpenSettings,
  onRequestPermission,
  onToggleCategory,
}: NotificationSettingsPanelProps) {
  return (
    <PremiumProfileTrustCardSurface
      fallbackIcon="bell-badge-outline"
      fallbackLabel="Notifications"
      section="profile"
      style={styles.panel}
    >
      <SectionHeader
        compact
        subtitle="Reminder preferences are real and saved to your account."
        subtitleColor={profileSurface.utility.subtitle}
        title="Notifications"
        titleColor={profileSurface.utility.title}
        trailing={
          <StatusChip
            decorative={false}
            label={permission.badgeLabel}
            tone={permission.tone === 'success' ? 'success' : permission.tone === 'warning' ? 'warning' : 'neutral'}
            uppercase={false}
          />
        }
      />

      {loading ? (
        <LoadingStateCard
          compact
          minHeight={120}
          subtitle="Loading your reminder and notification preferences."
          title="Loading notifications"
        />
      ) : (
        <>
          <View style={styles.permissionCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              {permission.title}
            </Typography>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {permission.detail}
            </Typography>
            {permission.action === 'request_permission' && permission.actionLabel ? (
              <Button
                loading={syncingPermission}
                onPress={onRequestPermission}
                title={permission.actionLabel}
                variant="secondary"
              />
            ) : null}
            {permission.action === 'open_settings' && permission.actionLabel ? (
              <Button onPress={onOpenSettings} title={permission.actionLabel} variant="ghost" />
            ) : null}
          </View>

          {rows.map((row) => (
            <View key={row.category} style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
                  {row.title}
                </Typography>
                <Typography color={profileSurface.utility.subtitle} variant="Caption">
                  {row.description}
                </Typography>
              </View>
              <Button
                loading={updatingCategory === row.category}
                onPress={() => {
                  onToggleCategory(row.category, !row.enabled);
                }}
                title={row.enabled ? 'On' : 'Off'}
                variant={row.enabled ? 'secondary' : 'ghost'}
              />
            </View>
          ))}

          <View style={styles.reminderCard}>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {reminderState.detail}
            </Typography>
          </View>
        </>
      )}

      {errorMessage ? (
        <InlineErrorCard
          message={errorMessage}
          title="Notification update issue"
          tone="warning"
        />
      ) : null}
    </PremiumProfileTrustCardSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  permissionCard: {
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  preferenceRow: {
    alignItems: 'center',
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  preferenceTextWrap: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.xs,
  },
  reminderCard: {
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});

export type { NotificationSettingsPanelProps };
