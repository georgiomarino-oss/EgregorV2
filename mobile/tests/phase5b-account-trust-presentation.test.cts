import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeDeletionStatus,
  describeNotificationPermissionState,
  describePrivacySettings,
  describeReminderState,
  describeSafetyActionFeedback,
} from '../src/features/profile/services/accountTrustPresentation';

test('notification permission presentation maps state and next action clearly', () => {
  const granted = describeNotificationPermissionState('granted');
  const undetermined = describeNotificationPermissionState('undetermined');
  const denied = describeNotificationPermissionState('denied');
  const unsupported = describeNotificationPermissionState('unsupported');

  assert.equal(granted.badgeLabel, 'Enabled');
  assert.equal(granted.action, null);
  assert.equal(granted.tone, 'success');

  assert.equal(undetermined.badgeLabel, 'Not enabled');
  assert.equal(undetermined.action, 'request_permission');
  assert.equal(undetermined.actionLabel, 'Enable on this device');

  assert.equal(denied.badgeLabel, 'Blocked');
  assert.equal(denied.action, 'open_settings');
  assert.match(denied.detail, /blocked/i);

  assert.equal(unsupported.badgeLabel, 'Unavailable');
  assert.equal(unsupported.action, null);
  assert.match(unsupported.detail, /does not support/i);
});

test('reminder presentation reflects saved state and delivery constraints', () => {
  const disabled = describeReminderState({
    permissionState: 'undetermined',
    reminderEnabled: false,
  });
  const enabledGranted = describeReminderState({
    permissionState: 'granted',
    reminderEnabled: true,
  });
  const enabledDenied = describeReminderState({
    permissionState: 'denied',
    reminderEnabled: true,
  });

  assert.equal(disabled.tone, 'neutral');
  assert.match(disabled.detail, /no reminder is saved/i);

  assert.equal(enabledGranted.tone, 'success');
  assert.match(enabledGranted.detail, /saved/i);
  assert.match(enabledGranted.detail, /delivery depends/i);

  assert.equal(enabledDenied.tone, 'warning');
  assert.match(enabledDenied.detail, /saved/i);
  assert.match(enabledDenied.detail, /silent/i);
});

test('privacy summary presentation uses plain language mapping for persisted settings', () => {
  const summary = describePrivacySettings({
    allowCircleInvites: false,
    allowDirectInvites: true,
    livePresenceVisibility: 'hidden',
    memberListVisibility: 'circles_only',
  });

  assert.match(summary.inviteRequests, /paused/i);
  assert.match(summary.directInvites, /outside your circles|outside your circles can send invite requests/i);
  assert.match(summary.livePresence, /hidden/i);
  assert.match(summary.memberVisibility, /shared circles/i);
});

test('account deletion status presentation is transparent and idempotent-aware', () => {
  const none = describeDeletionStatus(null);
  const requested = describeDeletionStatus('requested');
  const inReview = describeDeletionStatus('in_review');
  const completed = describeDeletionStatus('completed');
  const cancelled = describeDeletionStatus('cancelled');

  assert.equal(none.requestDisabled, false);
  assert.equal(none.badgeLabel, 'No request');

  assert.equal(requested.requestDisabled, true);
  assert.equal(requested.badgeLabel, 'Requested');

  assert.equal(inReview.requestDisabled, true);
  assert.equal(inReview.badgeLabel, 'In review');

  assert.equal(completed.requestDisabled, true);
  assert.equal(completed.badgeTone, 'success');

  assert.equal(cancelled.requestDisabled, false);
  assert.equal(cancelled.badgeLabel, 'Cancelled');
});

test('safety action feedback messages map block/unblock/report outcomes', () => {
  assert.equal(
    describeSafetyActionFeedback({
      action: 'block',
      targetLabel: 'Jordan',
    }),
    'Jordan has been blocked.',
  );

  assert.equal(
    describeSafetyActionFeedback({
      action: 'unblock',
      targetLabel: 'Jordan',
    }),
    'Jordan has been unblocked.',
  );

  assert.equal(
    describeSafetyActionFeedback({
      action: 'report',
      targetLabel: 'Jordan',
    }),
    'Report submitted for Jordan.',
  );
});
