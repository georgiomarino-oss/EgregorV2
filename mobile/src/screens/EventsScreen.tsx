import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EventsStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { getDeviceTimeZoneLabel } from '../lib/dateTime';
import { PROFILE_SECTION_GAP } from '../theme/figmaV2Layout';
import { EmbeddedGlobeCard } from '../features/events/components/EmbeddedGlobeCard';
import { EventFilterBar } from '../features/events/components/EventFilterBar';
import { EventsHeader } from '../features/events/components/EventsHeader';
import { OccurrenceList } from '../features/events/components/OccurrenceList';
import { useEventNotifications } from '../features/events/hooks/useEventNotifications';
import { useEventsData } from '../features/events/hooks/useEventsData';
import { useOccurrenceFeed } from '../features/events/hooks/useOccurrenceFeed';
import type { ScheduledEventOccurrence } from '../features/events/types';
import type { AppEvent } from '../lib/api/data';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const deviceTimeZoneLabel = useMemo(() => getDeviceTimeZoneLabel(), []);
  const [operationError, setOperationError] = useState<string | null>(null);

  const {
    activePresence,
    error,
    events,
    libraryError,
    libraryItems,
    libraryLoading,
    loading,
    newsItems,
    newsSyncError,
    nowTick,
    reloadLibrary,
  } = useEventsData();

  const {
    allScheduledEvents,
    categoryFilters,
    liveFilterCount,
    sections,
    selectedCategory,
    setSelectedCategory,
    setTimeFilter,
    timeFilter,
    todayFilterCount,
    tomorrowFilterCount,
    visibleEvents,
  } = useOccurrenceFeed({
    events,
    libraryItems,
    newsItems,
    nowTick,
  });

  const { subscribedAll, subscribedKeys, toggleOccurrenceSubscription, updatingSubscriptionKey } =
    useEventNotifications({
      onError: setOperationError,
    });

  const upcomingCount = useMemo(
    () => allScheduledEvents.filter((occurrence) => occurrence.status !== 'live').length,
    [allScheduledEvents],
  );
  const activeParticipantCount = useMemo(() => {
    const uniqueUsers = new Set(activePresence.map((entry) => entry.userId));
    return uniqueUsers.size;
  }, [activePresence]);

  const onOpenOccurrence = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      const params: EventsStackParamList['EventRoom'] = {
        allowAudioGeneration: false,
        durationMinutes: occurrence.durationMinutes,
        eventSource: occurrence.source,
        eventTitle: occurrence.title,
        occurrenceKey: occurrence.occurrenceKey,
        scheduledStartAt: occurrence.startsAt,
        scriptText: occurrence.script,
        ...(occurrence.source === 'template' ? { eventTemplateId: occurrence.favoriteKey } : {}),
      };

      navigation.navigate('EventRoom', params);
    },
    [navigation],
  );

  const onOpenEventRoom = useCallback(
    (event: AppEvent) => {
      navigation.navigate('EventRoom', {
        durationMinutes: event.durationMinutes,
        eventId: event.id,
        eventTitle: event.title,
        scheduledStartAt: event.startsAt,
      });
    },
    [navigation],
  );

  const onOpenEventDetails = useCallback(
    (event: AppEvent) => {
      navigation.navigate('EventDetails', {
        eventId: event.id,
      });
    },
    [navigation],
  );

  const onOpenOccurrenceDetails = useCallback(
    (occurrence: ScheduledEventOccurrence) => {
      if (occurrence.source !== 'template') {
        return;
      }

      navigation.navigate('EventDetails', {
        eventTemplateId: occurrence.favoriteKey,
      });
    },
    [navigation],
  );

  const onTimeFilterPress = useCallback(
    (nextFilter: 'live' | 'today' | 'tomorrow') => {
      setTimeFilter((current) => (current === nextFilter ? null : nextFilter));
    },
    [setTimeFilter],
  );

  const onCategoryPress = useCallback(
    (category: string) => {
      setSelectedCategory((current) => (current === category ? null : category));
    },
    [setSelectedCategory],
  );

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      <EventsHeader
        deviceTimeZoneLabel={deviceTimeZoneLabel}
        liveCount={liveFilterCount}
        participantCount={activeParticipantCount}
        upcomingCount={upcomingCount}
      />

      <EmbeddedGlobeCard
        activePresence={activePresence}
        allScheduledEvents={allScheduledEvents}
        error={operationError ?? error}
        events={events}
        loading={loading}
        newsSyncError={newsSyncError}
        nowTick={nowTick}
        onOpenEventDetails={onOpenEventDetails}
        onOpenEventRoom={onOpenEventRoom}
        onOpenOccurrenceDetails={onOpenOccurrenceDetails}
        onOpenOccurrence={onOpenOccurrence}
        visibleEvents={visibleEvents}
      />

      <EventFilterBar
        categoryFilters={categoryFilters}
        liveFilterCount={liveFilterCount}
        onCategoryPress={onCategoryPress}
        onTimeFilterPress={onTimeFilterPress}
        selectedCategory={selectedCategory}
        timeFilter={timeFilter}
        todayFilterCount={todayFilterCount}
        tomorrowFilterCount={tomorrowFilterCount}
      />

      <OccurrenceList
        libraryError={libraryError}
        libraryLoading={libraryLoading}
        onOpenOccurrence={onOpenOccurrence}
        onRetryLibrary={() => {
          void reloadLibrary();
        }}
        onToggleOccurrenceSubscription={(occurrenceKey) => {
          void toggleOccurrenceSubscription(occurrenceKey);
        }}
        sections={sections}
        subscribedAll={subscribedAll}
        subscribedKeys={subscribedKeys}
        updatingSubscriptionKey={updatingSubscriptionKey}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
});
