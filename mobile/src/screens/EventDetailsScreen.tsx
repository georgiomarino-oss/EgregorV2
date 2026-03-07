import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ActionPanel } from '../components/ActionPanel';
import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import {
  EventDetailsHero,
  type EventDetailsStatusTone,
} from '../features/events/components/EventDetailsHero';
import {
  EventDetailsMeta,
  type EventDetailsMetaItem,
} from '../features/events/components/EventDetailsMeta';
import { toOccurrenceStatus } from '../features/events/utils/occurrence';
import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import {
  fetchEventById,
  fetchEventLibraryItemById,
  fetchEvents,
  getCachedEventById,
  getCachedEventLibraryItemById,
  getCachedEvents,
  type AppEvent,
  type EventLibraryItem,
} from '../lib/api/data';
import { formatEventDateTimeInDeviceZone } from '../lib/dateTime';
import { supabase } from '../lib/supabase';
import { sectionGap } from '../theme/layout';
import { handoffSurface, motion, radii, spacing } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventDetails'>;
type EventDetailsRoute = RouteProp<EventsStackParamList, 'EventDetails'>;

function isEventLiveNow(event: Pick<AppEvent, 'durationMinutes' | 'startsAt'>) {
  const startsAtMillis = new Date(event.startsAt).getTime();
  if (!Number.isFinite(startsAtMillis)) {
    return false;
  }

  const endsAtMillis = startsAtMillis + Math.max(1, event.durationMinutes) * 60 * 1000;
  const nowMillis = Date.now();
  return nowMillis >= startsAtMillis && nowMillis < endsAtMillis;
}

function formatEventStartLabel(event: AppEvent) {
  if (isEventLiveNow(event)) {
    return 'Live now';
  }

  return (
    formatEventDateTimeInDeviceZone(event.startsAt, {
      includeDate: true,
      includeTimeZone: true,
    }) ?? 'Scheduled'
  );
}

function summarizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= 170) {
    return normalized;
  }

  return `${normalized.slice(0, 167).trimEnd()}...`;
}

function toStatusTone(event: AppEvent): EventDetailsStatusTone {
  const occurrenceStatus = toOccurrenceStatus(event.startsAt, event.durationMinutes, Date.now());
  if (occurrenceStatus) {
    return occurrenceStatus;
  }

  return 'scheduled';
}

function toStatusLabel(statusTone: EventDetailsStatusTone) {
  if (statusTone === 'live') {
    return 'Live';
  }
  if (statusTone === 'soon') {
    return 'Soon';
  }
  if (statusTone === 'upcoming') {
    return 'Upcoming';
  }
  if (statusTone === 'template') {
    return 'Template';
  }

  return 'Scheduled';
}

function toContextLabel(statusTone: EventDetailsStatusTone) {
  if (statusTone === 'live') {
    return 'Collective room active';
  }
  if (statusTone === 'soon') {
    return 'Starting soon';
  }
  if (statusTone === 'upcoming') {
    return 'Upcoming collective room';
  }
  if (statusTone === 'template') {
    return 'Collective intention template';
  }

  return 'Scheduled collective room';
}

function toEventDetailsSafeErrorMessage(error: unknown, fallback: string) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  const normalized = rawMessage.toLowerCase();

  let safeMessage = fallback;

  if (
    normalized.includes('schema cache') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist')
  ) {
    safeMessage = 'Event details are temporarily unavailable. Please try again shortly.';
  } else if (
    normalized.includes('permission') ||
    normalized.includes('forbidden') ||
    normalized.includes('not allowed')
  ) {
    safeMessage = 'You do not have access to this event.';
  } else if (
    normalized.includes('not found') &&
    (normalized.includes('event') || normalized.includes('template'))
  ) {
    safeMessage = 'This event is no longer available.';
  }

  if (__DEV__ && safeMessage !== rawMessage) {
    console.warn('[Egregor][EventDetails]', safeMessage, rawMessage);
  }

  return safeMessage;
}

export function EventDetailsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const route = useRoute<EventDetailsRoute>();
  const reduceMotionEnabled = useReducedMotion();
  const sectionSettle = useMemo(() => new Animated.Value(0), []);

  const initialEventTemplate = route.params?.eventTemplateId
    ? (getCachedEventLibraryItemById(route.params.eventTemplateId) ?? null)
    : null;
  const initialEvent = route.params?.eventId
    ? (getCachedEventById(route.params.eventId) ?? null)
    : ((getCachedEvents(1)?.[0] ?? null) as AppEvent | null);
  const hasInitialDetailsRef = useRef(Boolean(initialEventTemplate || initialEvent));

  const [event, setEvent] = useState<AppEvent | null>(initialEventTemplate ? null : initialEvent);
  const [eventTemplate, setEventTemplate] = useState<EventLibraryItem | null>(initialEventTemplate);
  const [loading, setLoading] = useState(!(initialEventTemplate || initialEvent));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCapturePreview = __DEV__ && route.params?.eventId?.trim() === '__capture__';

  const palette = handoffSurface.eventDetails;

  useEffect(() => {
    if (reduceMotionEnabled) {
      sectionSettle.setValue(1);
      return;
    }

    sectionSettle.setValue(0);
    const animation = Animated.timing(sectionSettle, {
      duration: motion.durationMs.slow,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, sectionSettle]);

  const getSectionStyle = (index: number) => {
    if (reduceMotionEnabled) {
      return styles.noMotion;
    }

    return {
      opacity: sectionSettle.interpolate({
        inputRange: [0, 1],
        outputRange: [0.88, 1],
      }),
      transform: [
        {
          translateY: sectionSettle.interpolate({
            inputRange: [0, 1],
            outputRange: [10 + index * 4, 0],
          }),
        },
      ],
    };
  };

  const loadEvent = useCallback(async () => {
    if (!hasInitialDetailsRef.current) {
      setLoading(true);
    }

    try {
      if (isCapturePreview) {
        const startsAt = new Date(Date.now() + 14 * 60 * 1000).toISOString();
        setEvent({
          countryCode: 'GB',
          description:
            'A guided collective room for coherent intention, healing focus, and calm global presence.',
          durationMinutes: 12,
          hostNote:
            'Breathe into shared stillness, hold one clear intention, and let the field settle together.',
          id: '__capture__',
          participants: 142,
          region: 'Europe',
          startsAt,
          status: 'scheduled',
          subtitle: 'Collective resonance session',
          title: 'Global Harmonic Prayer',
          visibility: 'public',
        });
        setEventTemplate(null);
        hasInitialDetailsRef.current = true;
        setError(null);
        return;
      }

      const eventTemplateId = route.params?.eventTemplateId;
      if (eventTemplateId) {
        const selectedTemplate = await fetchEventLibraryItemById(eventTemplateId);
        setEventTemplate(selectedTemplate);
        setEvent(null);

        if (!selectedTemplate) {
          setError('Event template not found.');
        } else {
          hasInitialDetailsRef.current = true;
          setError(null);
        }

        return;
      }

      const eventId = route.params?.eventId;
      const selectedEvent = eventId ? await fetchEventById(eventId) : null;

      if (selectedEvent) {
        setEvent(selectedEvent);
        setEventTemplate(null);
        hasInitialDetailsRef.current = true;
        setError(null);
        return;
      }

      const fallbackEvents = await fetchEvents(1);
      setEvent(fallbackEvents[0] ?? null);
      setEventTemplate(null);
      hasInitialDetailsRef.current = true;
      setError(null);
    } catch (nextError) {
      setError(
        toEventDetailsSafeErrorMessage(nextError, 'Unable to load event details right now.'),
      );
    } finally {
      setLoading(false);
    }
  }, [
    hasInitialDetailsRef,
    isCapturePreview,
    route.params?.eventId,
    route.params?.eventTemplateId,
  ]);

  const refreshEvent = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvent();
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (isCapturePreview) {
      return;
    }

    const interval = setInterval(() => {
      void loadEvent();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [isCapturePreview, loadEvent]);

  useEffect(() => {
    if (isCapturePreview) {
      return;
    }

    const channel = supabase
      .channel('event-details-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void loadEvent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        void loadEvent();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isCapturePreview, loadEvent]);

  const eventStatusTone = event ? toStatusTone(event) : null;
  const eventMetaItems: EventDetailsMetaItem[] = event
    ? [
        { label: 'Starts', value: formatEventStartLabel(event) },
        { label: 'Participants', value: event.participants.toString() },
        { label: 'Duration', value: `${event.durationMinutes} min` },
        {
          label: 'Region',
          value: event.region?.trim() || event.countryCode?.trim() || 'Global',
        },
      ]
    : [];

  const templateMetaItems: EventDetailsMetaItem[] = eventTemplate
    ? [
        { label: 'Category', value: eventTemplate.category ?? 'Manifestation' },
        { label: 'Duration', value: `${eventTemplate.durationMinutes} min` },
        { label: 'Energy', value: `${eventTemplate.startsCount} starts` },
      ]
    : [];

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      {loading && !event && !eventTemplate ? (
        <LoadingStateCard
          subtitle="Preparing event details and room context."
          title="Loading event details"
        />
      ) : null}

      {eventTemplate ? (
        <>
          <EventDetailsHero
            contextLabel={toContextLabel('template')}
            statusLabel={toStatusLabel('template')}
            statusTone="template"
            subtitle={summarizeText(
              eventTemplate.body,
              'Template script ready for a guided collective intention room.',
            )}
            title={eventTemplate.title}
          />

          <Animated.View style={getSectionStyle(0)}>
            <EventDetailsMeta
              heading="Template details"
              helper="Review the template before opening a collective room."
              items={templateMetaItems}
            />
          </Animated.View>

          <Animated.View style={getSectionStyle(1)}>
            <ActionPanel
              accessibilityHint="Contains available actions for this event template."
              accessibilityLabel="Template actions"
              accessibilityRole="summary"
              backgroundColor={palette.actions.panelBackground}
              borderColor={palette.actions.panelBorder}
            >
              <Typography
                allowFontScaling={false}
                color={palette.actions.hintText}
                variant="Caption"
              >
                This template can be used to open a room from the events surface.
              </Typography>
              <Button
                loading={refreshing}
                onPress={() => {
                  void refreshEvent();
                }}
                title="Refresh"
                variant="secondary"
              />
            </ActionPanel>
          </Animated.View>

          <Animated.View
            style={[
              styles.detailPanel,
              {
                backgroundColor: palette.meta.detailBackground,
                borderColor: palette.meta.detailBorder,
              },
              getSectionStyle(2),
            ]}
          >
            <Typography
              allowFontScaling={false}
              color={palette.meta.detailTitle}
              variant="H2"
              weight="bold"
            >
              Manifestation script
            </Typography>
            <Typography allowFontScaling={false} color={palette.meta.detailBody} variant="Body">
              {eventTemplate.script}
            </Typography>
          </Animated.View>
        </>
      ) : null}

      {event ? (
        <>
          <EventDetailsHero
            contextLabel={toContextLabel(eventStatusTone ?? 'scheduled')}
            statusLabel={toStatusLabel(eventStatusTone ?? 'scheduled')}
            statusTone={eventStatusTone ?? 'scheduled'}
            subtitle={summarizeText(
              event.description,
              'Join this collective event and contribute your intention.',
            )}
            title={event.title}
          />

          <Animated.View style={getSectionStyle(0)}>
            <EventDetailsMeta
              heading="Room context"
              helper="Review timing and room context before entering the collective field."
              items={eventMetaItems}
            />
          </Animated.View>

          <Animated.View style={getSectionStyle(1)}>
            <ActionPanel
              accessibilityHint="Contains actions to join or refresh this event room."
              accessibilityLabel="Event room actions"
              accessibilityRole="summary"
              backgroundColor={palette.actions.panelBackground}
              borderColor={palette.actions.panelBorder}
            >
              <View
                style={[
                  styles.readinessChip,
                  {
                    backgroundColor: palette.actions.readinessBackground,
                    borderColor: palette.actions.readinessBorder,
                  },
                ]}
              >
                <Typography
                  allowFontScaling={false}
                  color={palette.actions.readinessText}
                  variant="Caption"
                  weight="bold"
                >
                  {eventStatusTone === 'live'
                    ? 'Room is active now'
                    : eventStatusTone === 'soon'
                      ? 'Room starts soon'
                      : 'Room ready to open'}
                </Typography>
              </View>

              <Typography
                allowFontScaling={false}
                color={palette.actions.hintText}
                variant="Caption"
              >
                Opening this room keeps your current event handoff intact.
              </Typography>

              <Button
                onPress={() =>
                  navigation.navigate('EventRoom', {
                    eventId: event.id,
                    eventTitle: event.title,
                  })
                }
                title={isEventLiveNow(event) ? 'Join live room' : 'Open room'}
                variant="gold"
              />
              <Button
                loading={refreshing}
                onPress={() => {
                  void refreshEvent();
                }}
                title="Refresh"
                variant="secondary"
              />
            </ActionPanel>
          </Animated.View>

          <Animated.View
            style={[
              styles.detailPanel,
              {
                backgroundColor: palette.meta.detailBackground,
                borderColor: palette.meta.detailBorder,
              },
              getSectionStyle(2),
            ]}
          >
            <Typography
              allowFontScaling={false}
              color={palette.meta.detailTitle}
              variant="H2"
              weight="bold"
            >
              Host note
            </Typography>
            <Typography allowFontScaling={false} color={palette.meta.detailBody} variant="Body">
              {event.hostNote?.trim() || 'Host note will appear here when available.'}
            </Typography>
          </Animated.View>

          <Animated.View
            style={[
              styles.detailPanel,
              {
                backgroundColor: palette.meta.detailBackground,
                borderColor: palette.meta.detailBorder,
              },
              getSectionStyle(3),
            ]}
          >
            <Typography
              allowFontScaling={false}
              color={palette.meta.detailTitle}
              variant="H2"
              weight="bold"
            >
              Access
            </Typography>
            <Typography allowFontScaling={false} color={palette.meta.detailBody} variant="Body">
              {event.visibility === 'public'
                ? 'Public room. Anyone can join with an account.'
                : 'Private room. Invite required.'}
            </Typography>
          </Animated.View>
        </>
      ) : null}

      {!loading && !event && !eventTemplate ? (
        <Animated.View style={[getSectionStyle(0)]}>
          <EmptyStateCard
            action={
              <Button
                loading={refreshing}
                onPress={() => {
                  void refreshEvent();
                }}
                title="Try again"
                variant="secondary"
              />
            }
            backgroundColor={palette.meta.detailBackground}
            body="Create or schedule an event in Supabase, then return to this screen."
            bodyColor={palette.meta.detailBody}
            borderColor={palette.meta.detailBorder}
            iconBackgroundColor={palette.hero.badgeBackground}
            iconBorderColor={palette.hero.badgeBorder}
            iconName="calendar-search"
            iconTint={palette.hero.badgeText}
            title="No event selected"
            titleColor={palette.meta.detailTitle}
          />
        </Animated.View>
      ) : null}

      {error ? (
        <Animated.View style={[getSectionStyle(4)]}>
          <RetryPanel
            loading={refreshing}
            message={error}
            onRetry={() => {
              void refreshEvent();
            }}
            retryLabel="Retry"
            style={styles.errorCard}
            title="Unable to load event details"
          />
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  detailPanel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorCard: {
    minHeight: 42,
  },
  noMotion: {
    opacity: 1,
  },
  readinessChip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
