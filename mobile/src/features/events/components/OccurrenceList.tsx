import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { EmptyStateCard } from '../../../components/EmptyStateCard';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { RetryPanel } from '../../../components/RetryPanel';
import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { HOME_CARD_GAP, SCREEN_PAD_X } from '../../../theme/figmaV2Layout';
import { CARD_PADDING_LG } from '../../../theme/layout';
import { eventsSurface, radii, spacing } from '../../../theme/tokens';
import type { OccurrenceSection, ScheduledEventOccurrence } from '../types';
import { OccurrenceCard } from './OccurrenceCard';

interface OccurrenceListProps {
  libraryError: string | null;
  libraryLoading: boolean;
  onOpenOccurrence: (occurrence: ScheduledEventOccurrence) => void;
  onRetryLibrary: () => void;
  onToggleOccurrenceSubscription: (occurrenceKey: string) => void;
  sections: OccurrenceSection[];
  subscribedAll: boolean;
  subscribedKeys: string[];
  updatingSubscriptionKey: string | null;
}

export function OccurrenceList({
  libraryError,
  libraryLoading,
  onOpenOccurrence,
  onRetryLibrary,
  onToggleOccurrenceSubscription,
  sections,
  subscribedAll,
  subscribedKeys,
  updatingSubscriptionKey,
}: OccurrenceListProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeSlideByCategory, setActiveSlideByCategory] = useState<
    Partial<Record<string, number>>
  >({});
  const [libraryRailWidth, setLibraryRailWidth] = useState<number | null>(null);

  const fallbackEventCardWidth = useMemo(() => {
    const laneWidth = windowWidth - SCREEN_PAD_X * 2 - CARD_PADDING_LG * 2 - 2;
    return Math.max(200, laneWidth);
  }, [windowWidth]);

  const eventCardWidth =
    libraryRailWidth && libraryRailWidth > 0 ? libraryRailWidth : fallbackEventCardWidth;

  const eventCardStep = useMemo(() => eventCardWidth + HOME_CARD_GAP, [eventCardWidth]);

  if (libraryLoading) {
    return (
      <LoadingStateCard
        compact
        subtitle="Preparing upcoming and live occurrences."
        title="Loading event feed"
      />
    );
  }

  if (libraryError) {
    return (
      <RetryPanel
        message={libraryError}
        onRetry={onRetryLibrary}
        retryLabel="Retry"
        style={styles.emptyStateCard}
        title="Could not load event templates"
      />
    );
  }

  if (sections.length === 0) {
    return (
      <EmptyStateCard
        backgroundColor={eventsSurface.occurrence.sectionBackground}
        body="Try another category or switch filters."
        bodyColor={eventsSurface.occurrence.itemBody}
        borderColor={eventsSurface.occurrence.sectionBorder}
        iconBackgroundColor={eventsSurface.occurrence.categoryBadgeBackground}
        iconBorderColor={eventsSurface.occurrence.categoryBadgeBorder}
        iconName="calendar-blank-outline"
        iconTint={eventsSurface.occurrence.categoryBadgeText}
        style={styles.emptyStateCard}
        title="No events in this filter"
        titleColor={eventsSurface.occurrence.itemTitle}
      />
    );
  }

  return (
    <>
      {sections.map((section) => (
        <View key={section.category} style={[styles.categorySection, styles.sectionShell]}>
          <SectionHeader
            title={section.category}
            titleColor={eventsSurface.occurrence.itemTitle}
            trailing={
              <Typography
                allowFontScaling={false}
                color={eventsSurface.occurrence.itemMeta}
                variant="Body"
                weight="bold"
              >
                {`${section.items.length} events`}
              </Typography>
            }
          />

          <ScrollView
            horizontal
            decelerationRate="fast"
            onLayout={(event) => {
              const measuredWidth = event.nativeEvent.layout.width;
              if (
                measuredWidth > 0 &&
                (libraryRailWidth === null || Math.abs(libraryRailWidth - measuredWidth) > 1)
              ) {
                setLibraryRailWidth(measuredWidth);
              }
            }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / eventCardStep);
              const clampedIndex = Math.max(0, Math.min(section.items.length - 1, nextIndex));
              setActiveSlideByCategory((current) => ({
                ...current,
                [section.category]: clampedIndex,
              }));
            }}
            snapToAlignment="start"
            snapToInterval={eventCardStep}
            contentContainerStyle={styles.occurrenceRail}
            showsHorizontalScrollIndicator={false}
          >
            {section.items.map((item, index) => {
              const isSubscribed = subscribedAll || subscribedKeys.includes(item.occurrenceKey);
              const isUpdatingBell = updatingSubscriptionKey === item.occurrenceKey;

              return (
                <OccurrenceCard
                  key={item.occurrenceKey}
                  isSubscribed={isSubscribed}
                  isUpdatingBell={isUpdatingBell}
                  item={item}
                  onOpen={() => onOpenOccurrence(item)}
                  onToggleSubscription={() => onToggleOccurrenceSubscription(item.occurrenceKey)}
                  orderIndex={index}
                  width={eventCardWidth}
                />
              );
            })}
          </ScrollView>

          {section.items.length > 1 ? (
            <View style={styles.dotRow}>
              {section.items.map((item, index) => {
                const isActive = (activeSlideByCategory[section.category] ?? 0) === index;

                return (
                  <View
                    key={`${section.category}-${item.occurrenceKey}-dot`}
                    style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  categorySection: {
    gap: spacing.sm,
  },
  dot: {
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: eventsSurface.occurrence.dotActive,
    borderColor: eventsSurface.occurrence.dotActive,
  },
  dotInactive: {
    backgroundColor: eventsSurface.occurrence.dotInactive,
    borderColor: eventsSurface.occurrence.dotInactiveBorder,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
  },
  emptyStateCard: {
    minHeight: 148,
    overflow: 'hidden',
  },
  occurrenceRail: {
    gap: HOME_CARD_GAP,
    paddingRight: 0,
  },
  sectionShell: {
    backgroundColor: eventsSurface.occurrence.sectionBackground,
    borderColor: eventsSurface.occurrence.sectionBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
