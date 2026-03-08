import { StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { PremiumProfileTrustCardSurface } from '../../../components/CinematicPrimitives';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { SectionHeader } from '../../../components/SectionHeader';
import { SegmentedTabs } from '../../../components/SegmentedTabs';
import { Typography } from '../../../components/Typography';
import type { PrivacySettings, PrivacyVisibility } from '../../../lib/api/privacy';
import { profileSurface, radii, spacing } from '../../../theme/tokens';
import type { PrivacySettingsSummary } from '../services/accountTrustPresentation';

type UpdatingField =
  | 'allowCircleInvites'
  | 'allowDirectInvites'
  | 'livePresenceVisibility'
  | 'memberListVisibility'
  | null;

interface PrivacyPresencePanelProps {
  errorMessage?: string | null;
  loading: boolean;
  privacySettings: PrivacySettings | null;
  summary: PrivacySettingsSummary | null;
  updatingField: UpdatingField;
  onToggleAllowCircleInvites: (value: boolean) => void;
  onToggleAllowDirectInvites: (value: boolean) => void;
  onUpdateLivePresenceVisibility: (value: PrivacyVisibility) => void;
  onUpdateMemberListVisibility: (value: PrivacyVisibility) => void;
}

const VISIBILITY_SEGMENT_OPTIONS = [
  { key: 'public', label: 'Everyone' },
  { key: 'circles_only', label: 'My circles' },
  { key: 'hidden', label: 'Hidden' },
];

export function PrivacyPresencePanel({
  errorMessage,
  loading,
  privacySettings,
  summary,
  updatingField,
  onToggleAllowCircleInvites,
  onToggleAllowDirectInvites,
  onUpdateLivePresenceVisibility,
  onUpdateMemberListVisibility,
}: PrivacyPresencePanelProps) {
  return (
    <PremiumProfileTrustCardSurface
      fallbackIcon="account-lock-outline"
      fallbackLabel="Privacy and presence"
      section="profile"
      style={styles.panel}
    >
      <SectionHeader
        compact
        subtitle="Choose how visible you are and who can invite you into shared spaces."
        subtitleColor={profileSurface.utility.subtitle}
        title="Privacy & Presence"
        titleColor={profileSurface.utility.title}
      />

      {loading || !privacySettings ? (
        <LoadingStateCard
          compact
          minHeight={140}
          subtitle="Loading your privacy and presence settings."
          title="Loading privacy settings"
        />
      ) : (
        <>
          <View style={styles.controlCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              Member list visibility
            </Typography>
            <SegmentedTabs
              activeKey={privacySettings.memberListVisibility}
              onChange={(nextValue) => {
                if (
                  nextValue === 'public' ||
                  nextValue === 'circles_only' ||
                  nextValue === 'hidden'
                ) {
                  onUpdateMemberListVisibility(nextValue);
                }
              }}
              options={VISIBILITY_SEGMENT_OPTIONS}
              section="profile"
            />
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {summary?.memberVisibility ?? ''}
            </Typography>
            {updatingField === 'memberListVisibility' ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                Saving...
              </Typography>
            ) : null}
          </View>

          <View style={styles.controlCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              Live presence visibility
            </Typography>
            <SegmentedTabs
              activeKey={privacySettings.livePresenceVisibility}
              onChange={(nextValue) => {
                if (
                  nextValue === 'public' ||
                  nextValue === 'circles_only' ||
                  nextValue === 'hidden'
                ) {
                  onUpdateLivePresenceVisibility(nextValue);
                }
              }}
              options={VISIBILITY_SEGMENT_OPTIONS}
              section="profile"
            />
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {summary?.livePresence ?? ''}
            </Typography>
            {updatingField === 'livePresenceVisibility' ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                Saving...
              </Typography>
            ) : null}
          </View>

          <View style={styles.controlCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              Circle invite requests
            </Typography>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {summary?.inviteRequests ?? ''}
            </Typography>
            <Button
              loading={updatingField === 'allowCircleInvites'}
              onPress={() => {
                onToggleAllowCircleInvites(!privacySettings.allowCircleInvites);
              }}
              title={privacySettings.allowCircleInvites ? 'Requests enabled' : 'Requests paused'}
              variant={privacySettings.allowCircleInvites ? 'secondary' : 'ghost'}
            />
          </View>

          <View style={styles.controlCard}>
            <Typography color={profileSurface.utility.title} variant="Body" weight="bold">
              Invites from outside your circles
            </Typography>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {summary?.directInvites ?? ''}
            </Typography>
            <Button
              loading={updatingField === 'allowDirectInvites'}
              onPress={() => {
                onToggleAllowDirectInvites(!privacySettings.allowDirectInvites);
              }}
              title={privacySettings.allowDirectInvites ? 'Allowed' : 'Limited'}
              variant={privacySettings.allowDirectInvites ? 'secondary' : 'ghost'}
            />
          </View>
        </>
      )}

      {errorMessage ? (
        <InlineErrorCard message={errorMessage} title="Privacy update issue" tone="warning" />
      ) : null}
    </PremiumProfileTrustCardSurface>
  );
}

const styles = StyleSheet.create({
  controlCard: {
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  panel: {
    gap: spacing.sm,
  },
});

export type { PrivacyPresencePanelProps };
