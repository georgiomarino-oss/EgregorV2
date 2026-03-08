import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ActionPanel } from '../components/ActionPanel';
import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import {
  EventDetailsHero,
  type EventDetailsStatusTone,
} from '../features/events/components/EventDetailsHero';
import { EventDetailsMeta } from '../features/events/components/EventDetailsMeta';
import { resolveLiveOccurrenceState, statusLabel } from '../features/events/services/liveModel';
import {
  fetchEventNotificationState,
  getEventOccurrenceByJoinTarget,
  setEventNotificationSubscription,
  type CanonicalEventOccurrence,
} from '../lib/api/data';
import { formatEventDateTimeInDeviceZone } from '../lib/dateTime';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';
import { handoffSurface, radii, spacing } from '../theme/tokens';

type EventDetailsRoute = RouteProp<EventsStackParamList, 'EventDetails'>;
type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;

function normalizeJoinTarget(route: EventDetailsRoute) {
  const occurrenceId = route.params?.occurrenceId?.trim() || '';
  const roomId = route.params?.roomId?.trim() || '';
  const eventId = route.params?.eventId?.trim() || '';

  return {
    legacyEventId: !occurrenceId && !roomId ? eventId : '',
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
  const palette = handoffSurface.eventDetails;

  const [occurrence, setOccurrence] = useState<CanonicalEventOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [updatingReminder, setUpdatingReminder] = useState(false);

  const resolvedState = useMemo(() => {
    if (!occurrence) {
      return 'upcoming';
    }
    return resolveLiveOccurrenceState(occurrence, Date.now());
  }, [occurrence]);

  const loadOccurrence = useCallback(async () => {
    const target = normalizeJoinTarget(route);
    if (!target.occurrenceId && !target.roomId && !target.legacyEventId) {
      setOccurrence(null);
      setError('Invalid live link: no occurrence target was provided.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const authenticatedUserId = userError ? null : (data.user?.id?.trim() ?? null);
      setUserId(authenticatedUserId);

      const resolved = await getEventOccurrenceByJoinTarget({
        ...(target.legacyEventId ? { legacyEventId: target.legacyEventId } : {}),
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
    setUpdatingReminder(true);
    try {
      await setEventNotificationSubscription({
        enabled: !reminderEnabled,
        subscriptionKey: key,
        userId,
      });
      setReminderEnabled((current) => !current);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not update reminder.');
    } finally {
      setUpdatingReminder(false);
    }
  }, [occurrence, reminderEnabled, userId]);

  useEffect(() => {
    void loadOccurrence();
  }, [loadOccurrence]);

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
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
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

          <ActionPanel
            accessibilityHint="Contains primary actions for this live room."
            accessibilityLabel="Live room actions"
            accessibilityRole="summary"
            backgroundColor={palette.actions.panelBackground}
            borderColor={palette.actions.panelBorder}
          >
            <Typography allowFontScaling={false} color={palette.actions.hintText} variant="Caption">
              {resolvedState === 'live'
                ? 'The room is active now.'
                : resolvedState === 'ended'
                  ? 'This session has ended.'
                  : 'You can enter the waiting room before the session goes live.'}
            </Typography>

            <Button
              disabled={resolvedState === 'ended'}
              onPress={() => {
                const roomScriptText =
                  occurrence.seriesPurpose?.trim() || occurrence.seriesDescription?.trim() || '';
                const roomParams: EventsStackParamList['EventRoom'] = {
                  durationMinutes: occurrence.durationMinutes,
                  eventTitle: occurrence.seriesName,
                  occurrenceId: occurrence.occurrenceId,
                  occurrenceKey: occurrence.occurrenceKey,
                  scheduledStartAt: occurrence.startsAtUtc,
                  ...(occurrence.roomId ? { roomId: occurrence.roomId } : {}),
                  ...(roomScriptText ? { scriptText: roomScriptText } : {}),
                };
                navigation.navigate('EventRoom', roomParams);
              }}
              title={primaryActionLabel}
              variant="gold"
            />

            <Button
              loading={updatingReminder}
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
          </ActionPanel>
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
          backgroundColor={palette.meta.detailBackground}
          body="This deep link does not resolve to a valid live occurrence or room."
          bodyColor={palette.meta.detailBody}
          borderColor={palette.meta.detailBorder}
          iconBackgroundColor={palette.hero.badgeBackground}
          iconBorderColor={palette.hero.badgeBorder}
          iconName="calendar-search"
          iconTint={palette.hero.badgeText}
          title="Live target unavailable"
          titleColor={palette.meta.detailTitle}
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
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: palette.meta.detailBackground,
              borderColor: palette.meta.detailBorder,
            },
          ]}
        >
          <Typography allowFontScaling={false} color={palette.meta.detailBody} variant="Body">
            Loading live room details...
          </Typography>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  errorCard: {
    minHeight: 44,
  },
  loadingCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
