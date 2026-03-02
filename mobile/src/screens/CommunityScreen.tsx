import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { StyleSheet, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CommunityStackParamList } from '../app/navigation/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  HOME_CARD_GAP,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
  SUBTITLE_TO_MAINCARD_GAP,
  TITLE_TO_SUBTITLE_GAP,
} from '../theme/figmaV2Layout';
import { colors } from '../theme/tokens';

type CommunityNavigation = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNavigation>();

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <View style={styles.headerBlock}>
        <Typography
          allowFontScaling={false}
          onLongPress={() => navigation.navigate('ColorSwatch')}
          variant="H1"
          weight="bold"
        >
          Global pulse
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Live awareness feed with fast path into active healing rooms.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={styles.section} variant="homeStat">
        <Typography allowFontScaling={false} variant="Metric" weight="bold">
          1,942
        </Typography>
        <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
          Active participants in this hour
        </Typography>

        <View style={styles.row}>
          <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
            <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
              Live events
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              14
            </Typography>
          </SurfaceCard>
          <SurfaceCard radius="md" style={styles.metricCard} variant="homeStatSmall">
            <Typography allowFontScaling={false} color={colors.textBodySoft} variant="Label">
              Countries
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              31
            </Typography>
          </SurfaceCard>
        </View>

        <Button
          onPress={() => navigation.navigate('CommunityHome')}
          title="Join strongest live room"
          variant="primary"
        />
      </SurfaceCard>

      <SurfaceCard radius="sm" style={[styles.feedCard, styles.firstAlert]} variant="homeAlert">
        <Typography allowFontScaling={false} variant="H2" weight="bold">
          Fast rise detected: Lisbon flood response
        </Typography>
        <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
          +83 joins in 5 min. Estimated coherence window: now
        </Typography>
      </SurfaceCard>

      <SurfaceCard radius="sm" style={styles.feedCard} variant="homeAlert">
        <Typography allowFontScaling={false} variant="H2" weight="bold">
          Your circle room opens in 9 min
        </Typography>
        <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
          24 waiting. You are host in this session.
        </Typography>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: HOME_CARD_GAP,
  },
  feedCard: {
    gap: PROFILE_ROW_GAP,
  },
  firstAlert: {
    marginBottom: HOME_CARD_GAP,
  },
  headerBlock: {
    gap: TITLE_TO_SUBTITLE_GAP,
    marginBottom: SUBTITLE_TO_MAINCARD_GAP,
  },
  metricCard: {
    flex: 1,
    gap: PROFILE_ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: HOME_CARD_GAP,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
    marginBottom: HOME_CARD_GAP,
  },
});
