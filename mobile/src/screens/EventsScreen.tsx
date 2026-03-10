import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { AlertBanner } from '../components/AlertBanner';
import { GhostButton } from '../components/AppButtons';
import { Screen } from '../components/Screen';
import { ToastCard } from '../components/ToastCard';
import { EmbeddedGlobeCard } from '../features/events/components/EmbeddedGlobeCard';
import { OccurrenceList } from '../features/events/components/OccurrenceList';
import { EventsHeader } from '../features/events/components/EventsHeader';
import { useEventNotifications } from '../features/events/hooks/useEventNotifications';
import { useEventsData } from '../features/events/hooks/useEventsData';
import { useOccurrenceFeed } from '../features/events/hooks/useOccurrenceFeed';
import type { ScheduledEventOccurrence } from '../features/events/types';
import type { AppEvent } from '../lib/api/data';
import { getDeviceTimeZoneLabel } from '../lib/dateTime';
import { spacing } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const deviceTimeZoneLabel = useMemo(() => getDeviceTimeZoneLabel(), []);
  const [operationError, setOperationError] = useState<string | null>(null);

  const {
    activePresence,
    activePresenceError,
    loading,
    nowTick,
    occurrences,
    occurrencesError,
    reloadOccurrences,
  } = useEventsData();

  const { subscribedAll, subscribedKeys, toggleOccurrenceSubscription, updatingSubscriptionKey } =
    useEventNotifications({
      onError: setOperationError,
    });

  const { allScheduledEvents, liveNowCount, next24HoursCount, sections } = useOccurrenceFeed({
    nowTick,
    occurrences,
    subscribedAll,
    subscribedKeys,
  });

  const activeParticipantCount = useMemo(() => {
    const uniqueUsers = new Set(activePresence.map((entry) => entry.userId));
    return uniqueUsers.size;
  }, [activePresence]);
  const legacyGlobeEvents = useMemo<AppEvent[]>(() => [], []);

  const uiError = operationError ?? occurrencesError ?? activePresenceError;

  const onOpenOccurrenceRoom = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      const roomParams: EventsStackParamList['EventRoom'] = {
        allowAudioGeneration: false,
        durationMinutes: occurrence.durationMinutes,
        eventTitle: occurrence.title,
        occurrenceKey: occurrence.occurrenceKey,
        scheduledStartAt: occurrence.startsAt,
        scriptText: occurrence.script,
        ...(occurrence.occurrenceId ? { occurrenceId: occurrence.occurrenceId } : {}),
        ...(occurrence.roomId ? { roomId: occurrence.roomId } : {}),
      };

      navigation.navigate('EventRoom', {
        ...roomParams,
      });
    },
    [navigation],
  );

  const onOpenOccurrenceDetails = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      if (!occurrence.occurrenceId && !occurrence.roomId) {
        setOperationError('This live item has no valid occurrence target.');
        return;
      }

      const detailParams: EventsStackParamList['EventDetails'] = {
        ...(occurrence.occurrenceId ? { occurrenceId: occurrence.occurrenceId } : {}),
        ...(occurrence.roomId ? { roomId: occurrence.roomId } : {}),
      };

      navigation.navigate('EventDetails', {
        ...detailParams,
      });
    },
    [navigation],
  );

  const onOpenOccurrence = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      if (occurrence.status === 'live' || occurrence.status === 'waiting_room') {
        onOpenOccurrenceRoom(occurrence);
        return;
      }

      onOpenOccurrenceDetails(occurrence);
    },
    [onOpenOccurrenceDetails, onOpenOccurrenceRoom],
  );

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="live"
    >
      <EventsHeader
        deviceTimeZoneLabel={deviceTimeZoneLabel}
        liveCount={liveNowCount}
        participantCount={activeParticipantCount}
        upcomingCount={next24HoursCount}
      />

      <EmbeddedGlobeCard
        activePresence={activePresence}
        allScheduledEvents={allScheduledEvents}
        error={null}
        events={legacyGlobeEvents}
        loading={loading}
        newsSyncError={null}
        nowTick={nowTick}
        onOpenEventDetails={() => {
          setOperationError('Legacy event targets are no longer supported in this flow.');
        }}
        onOpenEventRoom={() => {
          setOperationError('Legacy event targets are no longer supported in this flow.');
        }}
        onOpenOccurrence={onOpenOccurrence}
        onOpenOccurrenceDetails={onOpenOccurrenceDetails}
        visibleEvents={legacyGlobeEvents}
      />

      {uiError ? (
        <AlertBanner
          action={<GhostButton onPress={() => setOperationError(null)} title="Dismiss" />}
          message={uiError}
          title="Live feed unavailable"
          tone="warning"
        />
      ) : null}

      <OccurrenceList
        feedError={occurrencesError}
        feedLoading={loading}
        onOpenOccurrence={onOpenOccurrence}
        onRetryFeed={() => {
          void reloadOccurrences();
        }}
        onToggleOccurrenceSubscription={(occurrenceKey) => {
          void toggleOccurrenceSubscription(occurrenceKey);
        }}
        sections={sections}
        subscribedAll={subscribedAll}
        subscribedKeys={subscribedKeys}
        updatingSubscriptionKey={updatingSubscriptionKey}
      />

      {updatingSubscriptionKey ? (
        <ToastCard message="Syncing reminder preferences..." title="Live reminders" />
      ) : null}

      {sections.length === 0 && !loading && allScheduledEvents.length === 0 ? (
        <ToastCard message="No joinable live rooms right now." title="Live" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
});
