import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { StyleSheet, View } from 'react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  EVENTS_PANEL_HEIGHT,
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { colors } from '../theme/tokens';

type EventsNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

interface EventItem {
  id: string;
  subtitle: string;
  title: string;
}

const sampleEvents: EventItem[] = [
  {
    id: 'event-1',
    subtitle: '612 active now. 74 percent positive report trend.',
    title: 'Madrid - Emergency response room',
  },
  {
    id: 'event-2',
    subtitle: 'Live in 11 min. Strong cross-circle overlap.',
    title: 'Delhi - Night calm wave',
  },
];

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigation>();
  const primaryEventId = sampleEvents[0]?.id;

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="events"
    >
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Earth in prayer
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Join active circles and upcoming events from around the world.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={[styles.section, styles.mainPanel]} variant="eventsPanel">
        <View style={styles.globeWrap}>
          <LottieView autoPlay loop source={globeFallbackAnimation} style={styles.globeAnimation} />
        </View>

        {sampleEvents.map((event) => (
          <SurfaceCard key={event.id} radius="sm" style={styles.feedCard} variant="homeAlert">
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {event.title}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
              {event.subtitle}
            </Typography>
          </SurfaceCard>
        ))}

        <Button
          onPress={() => {
            if (primaryEventId) {
              navigation.navigate('EventDetails', { eventId: primaryEventId });
              return;
            }

            navigation.navigate('EventDetails');
          }}
          title="Open map event timeline"
          variant="primary"
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  globeAnimation: {
    height: 232,
    width: '100%',
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 232,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  mainPanel: {
    minHeight: EVENTS_PANEL_HEIGHT,
  },
  section: {
    gap: HOME_CARD_GAP,
  },
});
