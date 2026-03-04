import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchCommunitySnapshot, type CommunitySnapshot } from '../lib/api/data';
import {
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { colors, radii } from '../theme/tokens';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNavigation>();
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextSnapshot = await fetchCommunitySnapshot();
        setSnapshot(nextSnapshot);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : 'Failed to load community activity.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setSnapshot],
  );

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const openEventDetails = (eventId: string) => {
    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (!parent) {
      return;
    }

    parent.navigate('EventsTab', { params: { eventId }, screen: 'EventDetails' });
  };

  const onPrimaryAction = () => {
    if (snapshot?.strongestLiveEventId) {
      openEventDetails(snapshot.strongestLiveEventId);
      return;
    }

    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (parent) {
      parent.navigate('EventsTab');
      return;
    }

    void loadSnapshot(true);
  };

  const prayerCircleCount = snapshot?.liveEvents ?? 0;
  const eventsCircleCount = snapshot?.events.length ?? 0;

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Global pulse
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Live awareness feed with direct access to active collective rooms.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={styles.section} variant="homeStat">
        {loading && !snapshot ? (
          <ActivityIndicator color={colors.accentMintStart} />
        ) : (
          <>
            <Typography allowFontScaling={false} variant="Metric" weight="bold">
              {snapshot?.uniqueActiveParticipants ?? 0}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
              Active participants in the last 90 minutes
            </Typography>

            <View style={styles.row}>
              <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
                <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
                  Live events
                </Typography>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {snapshot?.liveEvents ?? 0}
                </Typography>
              </SurfaceCard>
              <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
                <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
                  Countries
                </Typography>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {snapshot?.countries ?? 0}
                </Typography>
              </SurfaceCard>
            </View>

            <Button
              onPress={onPrimaryAction}
              title={
                snapshot?.strongestLiveEventTitle ? 'Join strongest live room' : 'Explore events'
              }
              variant="primary"
            />
            <Button
              loading={refreshing}
              onPress={() => void loadSnapshot(true)}
              title="Refresh pulse"
              variant="secondary"
            />
          </>
        )}
      </SurfaceCard>

      {error ? (
        <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            Could not load community feed
          </Typography>
          <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
            {error}
          </Typography>
        </SurfaceCard>
      ) : null}

      {!loading && (snapshot?.alerts.length ?? 0) === 0 ? (
        <>
          <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              No live alerts right now
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              New event updates appear here as soon as rooms go live.
            </Typography>
          </SurfaceCard>

          <View style={styles.row}>
            <Pressable
              onPress={() => navigation.navigate('PrayerCircle')}
              style={({ pressed }) => [styles.metricCardPressable, pressed && styles.pressedScale]}
            >
              <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
                <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
                  Prayer Circle
                </Typography>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {prayerCircleCount}
                </Typography>
              </SurfaceCard>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('EventsCircle')}
              style={({ pressed }) => [styles.metricCardPressable, pressed && styles.pressedScale]}
            >
              <SurfaceCard
                contentPadding={10}
                radius="md"
                style={[styles.metricCard, styles.eventsCircleCardCompact]}
                variant="homeStatSmall"
              >
                <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
                  Events Circle
                </Typography>
                <Typography allowFontScaling={false} variant="H2" weight="bold">
                  {eventsCircleCount}
                </Typography>
              </SurfaceCard>
            </Pressable>
          </View>
        </>
      ) : (
        snapshot?.alerts.map((alert) => (
          <Pressable
            key={alert.eventId}
            onPress={() => openEventDetails(alert.eventId)}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressedScale]}
          >
            <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
              <Typography allowFontScaling={false} variant="H2" weight="bold">
                {alert.title}
              </Typography>
              <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
                {alert.subtitle}
              </Typography>
            </SurfaceCard>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: HOME_CARD_GAP,
    paddingBottom: HOME_CARD_GAP,
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  metricCard: {
    flex: 1,
    gap: PROFILE_ROW_GAP,
  },
  metricCardPressable: {
    flex: 1,
    borderRadius: radii.md,
  },
  eventsCircleCardCompact: {
    minHeight: 56,
  },
  pressedScale: {
    transform: [{ scale: 0.99 }],
  },
  pressable: {
    borderRadius: radii.sm,
  },
  row: {
    flexDirection: 'row',
    gap: HOME_CARD_GAP,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
  },
});
