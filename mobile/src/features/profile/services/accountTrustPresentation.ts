export type DeviceNotificationPermissionState =
  | 'denied'
  | 'granted'
  | 'undetermined'
  | 'unsupported';

export type PrivacyVisibility = 'circles_only' | 'hidden' | 'public';

export type AccountDeletionStatus =
  | 'acknowledged'
  | 'cancelled'
  | 'completed'
  | 'in_review'
  | 'rejected'
  | 'requested';

export interface NotificationPermissionPresentation {
  action: 'open_settings' | 'request_permission' | null;
  actionLabel: string | null;
  badgeLabel: string;
  detail: string;
  title: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface ReminderStatePresentation {
  detail: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface PrivacySettingsSummary {
  directInvites: string;
  inviteRequests: string;
  livePresence: string;
  memberVisibility: string;
}

export interface DeletionStatusPresentation {
  badgeLabel: string;
  badgeTone: 'danger' | 'neutral' | 'success' | 'warning';
  detail: string;
  headline: string;
  requestDisabled: boolean;
}

export function describeNotificationPermissionState(
  state: DeviceNotificationPermissionState,
): NotificationPermissionPresentation {
  if (state === 'granted') {
    return {
      action: null,
      actionLabel: null,
      badgeLabel: 'Enabled',
      detail: 'This device can receive reminder alerts when dispatch is available.',
      title: 'Device notifications are enabled.',
      tone: 'success',
    };
  }

  if (state === 'undetermined') {
    return {
      action: 'request_permission',
      actionLabel: 'Enable on this device',
      badgeLabel: 'Not enabled',
      detail: 'Reminder preferences still save to your account, but this device cannot alert yet.',
      title: 'Turn on notifications when you are ready.',
      tone: 'warning',
    };
  }

  if (state === 'denied') {
    return {
      action: 'open_settings',
      actionLabel: 'Open notification settings',
      badgeLabel: 'Blocked',
      detail:
        'Reminder preferences can still be saved, but alerts are blocked in your device settings.',
      title: 'Notifications are currently blocked on this device.',
      tone: 'warning',
    };
  }

  return {
    action: null,
    actionLabel: null,
    badgeLabel: 'Unavailable',
    detail: 'This device does not support push notifications in the current app environment.',
    title: 'Notifications are unavailable on this device.',
    tone: 'neutral',
  };
}

export function describeReminderState(input: {
  permissionState: DeviceNotificationPermissionState;
  reminderEnabled: boolean;
}): ReminderStatePresentation {
  if (!input.reminderEnabled) {
    return {
      detail: 'No reminder is saved for this live moment yet.',
      tone: 'neutral',
    };
  }

  if (input.permissionState === 'granted') {
    return {
      detail:
        'Reminder preference saved. Delivery depends on device availability and notification dispatch.',
      tone: 'success',
    };
  }

  if (input.permissionState === 'denied') {
    return {
      detail:
        'Reminder preference saved, but this device will stay silent until notifications are re-enabled in settings.',
      tone: 'warning',
    };
  }

  if (input.permissionState === 'undetermined') {
    return {
      detail:
        'Reminder preference saved. Enable notifications on this device to receive alerts here.',
      tone: 'warning',
    };
  }

  return {
    detail:
      'Reminder preference saved to your account. This device cannot receive push alerts in the current environment.',
    tone: 'neutral',
  };
}

function describeVisibility(
  value: PrivacyVisibility,
  labels: { circlesOnly: string; hidden: string; public: string },
) {
  if (value === 'public') {
    return labels.public;
  }
  if (value === 'hidden') {
    return labels.hidden;
  }
  return labels.circlesOnly;
}

export function describePrivacySettings(input: {
  allowCircleInvites: boolean;
  allowDirectInvites: boolean;
  livePresenceVisibility: PrivacyVisibility;
  memberListVisibility: PrivacyVisibility;
}): PrivacySettingsSummary {
  return {
    directInvites: input.allowDirectInvites
      ? 'People outside your circles can send invite requests.'
      : 'Only people who already share a circle with you can invite you.',
    inviteRequests: input.allowCircleInvites
      ? 'Circle invite requests are enabled.'
      : 'New circle invite requests are paused.',
    livePresence: describeVisibility(input.livePresenceVisibility, {
      circlesOnly: 'Your live presence is visible to people in shared circles.',
      hidden: 'Your live presence is hidden from other participants.',
      public: 'Your live presence is visible to all signed-in users.',
    }),
    memberVisibility: describeVisibility(input.memberListVisibility, {
      circlesOnly: 'Your profile appears in member lists for shared circles.',
      hidden: 'Your profile is hidden from member lists for other users.',
      public: 'Your profile appears in member lists across the app.',
    }),
  };
}

export function describeDeletionStatus(
  status: AccountDeletionStatus | null,
): DeletionStatusPresentation {
  if (!status) {
    return {
      badgeLabel: 'No request',
      badgeTone: 'neutral',
      detail:
        'Requesting deletion starts full account deletion, not deactivation. Support reviews requests, and limited records may be retained for legal, billing, fraud, or security obligations.',
      headline: 'No account deletion request is active.',
      requestDisabled: false,
    };
  }

  if (status === 'requested') {
    return {
      badgeLabel: 'Requested',
      badgeTone: 'warning',
      detail:
        'Your full account deletion request was received. Support will verify ownership and acknowledge next steps.',
      headline: 'Deletion request submitted.',
      requestDisabled: true,
    };
  }

  if (status === 'acknowledged') {
    return {
      badgeLabel: 'Acknowledged',
      badgeTone: 'warning',
      detail:
        'Support acknowledged your request. Your account remains inaccessible for repeated deletion requests while review continues.',
      headline: 'Deletion request acknowledged.',
      requestDisabled: true,
    };
  }

  if (status === 'in_review') {
    return {
      badgeLabel: 'In review',
      badgeTone: 'warning',
      detail:
        'Support is actively processing your deletion request. Completion timing depends on verification and legal obligations.',
      headline: 'Deletion request in review.',
      requestDisabled: true,
    };
  }

  if (status === 'completed') {
    return {
      badgeLabel: 'Completed',
      badgeTone: 'success',
      detail:
        'Your deletion request has been completed. Some records may remain only when required for legal, security, fraud, or audit reasons.',
      headline: 'Account deletion completed.',
      requestDisabled: true,
    };
  }

  if (status === 'cancelled') {
    return {
      badgeLabel: 'Cancelled',
      badgeTone: 'neutral',
      detail: 'The deletion request was cancelled and no longer blocks a new request.',
      headline: 'Deletion request cancelled.',
      requestDisabled: false,
    };
  }

  if (status === 'rejected') {
    return {
      badgeLabel: 'Rejected',
      badgeTone: 'danger',
      detail:
        'The request was closed by support. Open support for details and, if needed, submit a new request.',
      headline: 'Deletion request closed.',
      requestDisabled: false,
    };
  }

  const unexpectedStatus: never = status;
  return {
    badgeLabel: 'Status updated',
    badgeTone: 'neutral',
    detail: 'Deletion request status changed.',
    headline: `Unexpected status: ${unexpectedStatus}`,
    requestDisabled: false,
  };
}

export function describeSafetyActionFeedback(input: {
  action: 'block' | 'report' | 'unblock';
  targetLabel: string;
}) {
  if (input.action === 'block') {
    return `${input.targetLabel} has been blocked.`;
  }
  if (input.action === 'unblock') {
    return `${input.targetLabel} has been unblocked.`;
  }
  return `Report submitted for ${input.targetLabel}.`;
}
