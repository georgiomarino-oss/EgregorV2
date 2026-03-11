import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { PremiumLiveEventCardSurface } from '../components/CinematicPrimitives';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Typography } from '../components/Typography';
import {
  EventDetailsHero,
  type EventDetailsStatusTone,
} from '../features/events/components/EventDetailsHero';
import { EventDetailsMeta } from '../features/events/components/EventDetailsMeta';
import { ReminderStatusNotice } from '../features/events/components/ReminderStatusNotice';
import { resolveLiveOccurrenceState, statusLabel } from '../features/events/services/liveModel';
import {
  describeNotificationPermissionState,
  describeReminderState,
} from '../features/profile/services/accountTrustPresentation';
import {
  fetchEventNotificationState,
  getEventOccurrenceByJoinTarget,
  setEventNotificationSubscription,
  type CanonicalEventOccurrence,
} from '../lib/api/data';
import { resolveCinematicArt } from '../lib/art/cinematicArt';
import { submitModerationReport } from '../lib/api/safety';
import { formatEventDateTimeInDeviceZone } from '../lib/dateTime';
import {
  getDeviceNotificationPermissionState,
  openSystemNotificationSettings,
  requestNotificationPermissionAndRegisterCurrentDevice,
} from '../lib/notifications/registerDevicePushTarget';
import { buildSupportRouteMetadata } from '../lib/support';
import { supabase } from '../lib/supabase';
import { MOBILE_ANALYTICS_EVENTS, trackMobileEvent } from '../lib/observability';
import { sectionGap } from '../theme/layout';
import { sectionVisualThemes, spacing } from '../theme/tokens';

type EventDetailsRoute = RouteProp<EventsStackParamList, 'EventDetails'>;
type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;

function normalizeJoinTarget(route: EventDetailsRoute) {
  const occurrenceId = route.params?.occurrenceId?.trim() || '';
  const roomId = route.params?.roomId?.trim() || '';

  return {
    occurrenceId,
    roomId,
  };
}

function toAccessSummary(occurrence: CanonicalEventOccurrence) {
  const scope =
    occurrence.visibilityScope === 'circle'
      ? 'Circle'
      : occurrence.visibilityScope === 'private'
        ? 'Private'
        : 'Global';
  const accessMode =
    occurrence.accessMode === 'circle_members'
      ? 'Circle members'
      : occurrence.accessMode === 'invite_only'
        ? 'Invite only'
        : 'Open';
  return `${scope} | ${accessMode}`;
}

function toContextLabel(occurrence: CanonicalEventOccurrence) {
  if (occurrence.visibilityScope === 'circle') {
    return 'Circle live room';
  }
  if (occurrence.accessMode === 'invite_only') {
    return 'Invite live room';
  }
  return 'Global live room';
}

function toHeroTone(state: ReturnType<typeof resolveLiveOccurrenceState>): EventDetailsStatusTone {
  if (state === 'live') {
    return 'live';
  }
  if (state === 'waiting_room') {
    return 'soon';
  }
  if (state === 'upcoming') {
    return 'upcoming';
  }
  return 'scheduled';
}

export function EventDetailsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const route = useRoute<EventDetailsRoute>();

  const [occurrence, setOccurrence] = useState<CanonicalEventOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [updatingReminder, setUpdatingReminder] = useState(false);
  const [notificationPermissionState, setNotificationPermissionState] = useState<
    'denied' | 'granted' | 'undetermined' | 'unsupported'
  >('unsupported');
  const [syncingNotificationPermission, setSyncingNotificationPermission] = useState(false);
  const [reportingOccurrence, setReportingOccurrence] = useState(false);
  const viewedOccurrenceIdRef = useRef<string | null>(null);

  const resolvedState = useMemo(() => {
    if (!occurrence) {
      return 'upcoming';
    }
    return resolveLiveOccurrenceState(occurrence, Date.now());
  }, [occurrence]);

  const loadOccurrence = useCallback(async () => {
    const target = normalizeJoinTarget(route);
    if (!target.occurrenceId && !target.roomId) {
      setOccurrence(null);
      setError('Invalid live link: no occurrence target was provided.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const authenticatedUserId = userError ? null : (data.user?.id?.trim() ?? null);
      setUserId(authenticatedUserId);
      const permissionState = await getDeviceNotificationPermissionState();
      setNotificationPermissionState(permissionState);

      const resolved = await getEventOccurrenceByJoinTarget({
        ...(target.occurrenceId ? { occurrenceId: target.occurrenceId } : {}),
        ...(target.roomId ? { roomId: target.roomId } : {}),
      });

      if (!resolved) {
        setOccurrence(null);
        setError('This live room is unavailable or you no longer have access.');
        return;
      }

      setOccurrence(resolved);
      setError(null);

      if (authenticatedUserId) {
        const notificationState = await fetchEventNotificationState(authenticatedUserId);
        const key = `occurrence:${resolved.occurrenceId}`;
        setReminderEnabled(
          notificationState.subscribedAll || notificationState.subscriptionKeys.includes(key),
        );
      } else {
        setReminderEnabled(false);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load live details.');
    } finally {
      setLoading(false);
    }
  }, [route]);

  const refreshOccurrence = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOccurrence();
    } finally {
      setRefreshing(false);
    }
  }, [loadOccurrence]);

  const toggleReminder = useCallback(async () => {
    if (!userId || !occurrence) {
      setError('Sign in to save reminders for this live room.');
      return;
    }

    const key = `occurrence:${occurrence.occurrenceId}`;
    const nextEnabled = !reminderEnabled;
    setUpdatingReminder(true);
    try {
      if (nextEnabled && notificationPermissionState === 'undetermined') {
        setSyncingNotificationPermission(true);
        trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_TRIGGERED, {
          source: 'event_details_reminder_toggle',
        });
        const permissionResult = await requestNotificationPermissionAndRegisterCurrentDevice({
          registrationSource: 'event_details_reminder',
        });
        setNotificationPermissionState(permissionResult.permissionState);
        trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, {
          permission_state: permissionResult.permissionState,
          source: 'event_details_reminder_toggle',
        });
      }

      await setEventNotificationSubscription({
        enabled: nextEnabled,
        subscriptionKey: key,
        userId,
      });
      setReminderEnabled(nextEnabled);
      setError(null);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.LIVE_REMINDER_TOGGLED, {
        enabled: nextEnabled,
        occurrence_id: occurrence.occurrenceId,
        permission_state: notificationPermissionState,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not update reminder.');
    } finally {
      setSyncingNotificationPermission(false);
      setUpdatingReminder(false);
    }
  }, [notificationPermissionState, occurrence, reminderEnabled, userId]);

  const reportOccurrence = useCallback(async () => {
    if (!occurrence) {
      return;
    }

    setReportingOccurrence(true);
    try {
      const supportRouting = buildSupportRouteMetadata({
        source: 'moderation_report',
        surface: 'event_details',
      });
      await submitModerationReport({
        details: `Live occurrence report submitted for ${occurrence.occurrenceId}.`,
        reasonCode: 'other',
        supportMetadata: supportRouting.supportMetadata,
        supportRoute: supportRouting.supportRoute,
        targetId: occurrence.occurrenceId,
        targetType: 'event_occurrence',
      });
      setError(null);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.TRUST_ACTION_REPORT, {
        source: 'event_details',
        target_type: 'event_occurrence',
      });
      Alert.alert('Report submitted', 'This live room report was added to moderation review.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not submit report.');
    } finally {
      setReportingOccurrence(false);
    }
  }, [occurrence]);

  const reminderStatus = useMemo(
    () =>
      describeReminderState({
        permissionState: notificationPermissionState,
        reminderEnabled,
      }),
    [notificationPermissionState, reminderEnabled],
  );
  const notificationPermission = useMemo(
    () => describeNotificationPermissionState(notificationPermissionState),
    [notificationPermissionState],
  );
  const reminderStatusActionLabel = reminderEnabled
    ? notificationPermission.actionLabel
    : null;

  const onReminderStatusAction = useCallback(() => {
    if (notificationPermission.action === 'request_permission') {
      setSyncingNotificationPermission(true);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_TRIGGERED, {
        source: 'event_details_permission_notice',
      });
      void requestNotificationPermissionAndRegisterCurrentDevice({
        registrationSource: 'event_details_reminder',
      })
        .then((result) => {
          setNotificationPermissionState(result.permissionState);
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, {
            permission_state: result.permissionState,
            source: 'event_details_permission_notice',
          });
        })
        .catch((nextError) => {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Could not enable notifications on this device.',
          );
        })
        .finally(() => {
          setSyncingNotificationPermission(false);
        });
      return;
    }

    if (notificationPermission.action === 'open_settings') {
      void openSystemNotificationSettings().catch(() => {
        setError('Could not open notification settings.');
      });
    }
  }, [notificationPermission.action]);

  useEffect(() => {
    void loadOccurrence();
  }, [loadOccurrence]);

  useEffect(() => {
    const occurrenceId = occurrence?.occurrenceId?.trim();
    if (!occurrence || !occurrenceId || viewedOccurrenceIdRef.current === occurrenceId) {
      return;
    }

    viewedOccurrenceIdRef.current = occurrenceId;
    trackMobileEvent(MOBILE_ANALYTICS_EVENTS.LIVE_DETAILS_VIEWED, {
      occurrence_id: occurrenceId,
      room_id: occurrence.roomId ?? null,
      status: occurrence.status,
    });
  }, [occurrence?.occurrenceId, occurrence?.roomId, occurrence?.status]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadOccurrence();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadOccurrence]);

  const startsLabel = occurrence
    ? (formatEventDateTimeInDeviceZone(occurrence.startsAtUtc, {
        includeDate: true,
        includeTimeZone: true,
      }) ?? 'Scheduled')
    : 'Scheduled';

  const metaItems = occurrence
    ? [
        { label: 'Starts', value: startsLabel },
        { label: 'State', value: statusLabel(resolvedState) },
        { label: 'Duration', value: `${occurrence.durationMinutes} min` },
        {
          label: 'Participants',
          value: `${occurrence.activeParticipantCount} active | ${occurrence.participantCount} total`,
        },
        { label: 'Access', value: toAccessSummary(occurrence) },
      ]
    : [];

  const primaryActionLabel =
    resolvedState === 'live'
      ? 'Join now'
      : resolvedState === 'waiting_room'
        ? 'Enter waiting room'
        : resolvedState === 'upcoming'
          ? 'Open waiting room'
          : 'Ended';

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="live">
      {occurrence ? (
        <>
          <EventDetailsHero
            contextLabel={toContextLabel(occurrence)}
            statusLabel={statusLabel(resolvedState)}
            statusTone={toHeroTone(resolvedState)}
            subtitle={
              occurrence.seriesDescription?.trim() ||
              occurrence.seriesPurpose?.trim() ||
              'Join this shared intention room.'
            }
            title={occurrence.seriesName}
          />

          <EventDetailsMeta
            heading="Live room details"
            helper="Every join action resolves to this occurrence and room identity."
            items={metaItems}
          />

          <PremiumLiveEventCardSurface
            accessibilityHint="Contains primary actions for this live room."
            accessibilityLabel="Live room actions"
            artSource={resolveCinematicArt('live.card.default')}
            fallbackIcon="play-circle-outline"
            fallbackLabel="Live room actions"
            section="live"
            style={styles.actionPanel}
          >
            <SectionHeader
              compact
              subtitle={
                resolvedState === 'live'
                  ? 'The room is active now.'
                  : resolvedState === 'ended'
                    ? 'This live room has ended.'
                    : 'You can enter the waiting room before this room goes live.'
              }
              subtitleColor={sectionVisualThemes.live.nav.labelIdle}
              title="Room actions"
              titleColor={sectionVisualThemes.live.nav.labelActive}
            />

            <View style={styles.actionButtons}>
              <Button
                disabled={resolvedState === 'ended'}
                onPress={() => {
                  trackMobileEvent(MOBILE_ANALYTICS_EVENTS.LIVE_DETAILS_JOIN_PRESSED, {
                    occurrence_id: occurrence.occurrenceId,
                    resolved_state: resolvedState,
                    room_id: occurrence.roomId ?? null,
                  });
                  const roomParams: EventsStackParamList['EventRoom'] = {
                    durationMinutes: occurrence.durationMinutes,
                    eventTitle: occurrence.seriesName,
                    occurrenceId: occurrence.occurrenceId,
                    occurrenceKey: occurrence.occurrenceKey,
                    scheduledStartAt: occurrence.startsAtUtc,
                    ...(occurrence.roomId ? { roomId: occurrence.roomId } : {}),
                  };
                  navigation.navigate('EventRoom', roomParams);
                }}
                title={primaryActionLabel}
                variant="gold"
              />

              <Button
                loading={updatingReminder || syncingNotificationPermission}
                onPress={() => {
                  void toggleReminder();
                }}
                title={reminderEnabled ? 'Remove reminder' : 'Save reminder'}
                variant="secondary"
              />

              <Button
                loading={refreshing}
                onPress={() => {
                  void refreshOccurrence();
                }}
                title="Refresh"
                variant="secondary"
              />

              <Button
                loading={reportingOccurrence}
                onPress={() => {
                  Alert.alert(
                    'Report live room',
                    'Submit this live experience to moderation review?',
                    [
                      {
                        style: 'cancel',
                        text: 'Cancel',
                      },
                      {
                        text: 'Report',
                        onPress: () => {
                          void reportOccurrence();
                        },
                      },
                    ],
                  );
                }}
                title="Report"
                variant="ghost"
              />
            </View>

            <ReminderStatusNotice
              {...(reminderStatusActionLabel
                ? {
                    actionLabel: reminderStatusActionLabel,
                    onAction: onReminderStatusAction,
                  }
                : {})}
              detail={reminderStatus.detail}
              tone={reminderStatus.tone}
            />
          </PremiumLiveEventCardSurface>
        </>
      ) : null}

      {!loading && !occurrence ? (
        <EmptyStateCard
          action={
            <Button
              loading={refreshing}
              onPress={() => {
                void refreshOccurrence();
              }}
              title="Try again"
              variant="secondary"
            />
          }
          backgroundColor={sectionVisualThemes.live.surface.card[1]}
          body="This deep link does not resolve to a valid live occurrence or room."
          bodyColor={sectionVisualThemes.live.nav.labelIdle}
          borderColor={sectionVisualThemes.live.surface.border}
          iconBackgroundColor={sectionVisualThemes.live.surface.card[0]}
          iconBorderColor={sectionVisualThemes.live.media.frameBorder}
          iconName="calendar-search"
          iconTint={sectionVisualThemes.live.media.icon}
          title="Live target unavailable"
          titleColor={sectionVisualThemes.live.nav.labelActive}
        />
      ) : null}

      {error ? (
        <RetryPanel
          loading={refreshing}
          message={error}
          onRetry={() => {
            void refreshOccurrence();
          }}
          retryLabel="Retry"
          style={styles.errorCard}
          title="Unable to load live details"
        />
      ) : null}

      {loading ? (
        <LoadingStateCard
          subtitle="Preparing canonical occurrence metadata and actions."
          title="Loading live room details"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    gap: spacing.xs,
  },
  actionPanel: {
    gap: spacing.sm,
  },
  content: {
    gap: sectionGap,
  },
  errorCard: {
    minHeight: 44,
  },
});
