import { StyleSheet, View } from 'react-native';

import { figmaV2Reference } from '../theme/figma-v2-reference';
import {
  PROFILE_ROW_HEIGHT,
  PROFILE_ROW_PAD_BOTTOM,
  PROFILE_ROW_PAD_TOP,
  PROFILE_ROW_PAD_X,
} from '../theme/layout';
import { SurfaceCard } from './SurfaceCard';
import { Typography } from './Typography';

interface MetricRowProps {
  label: string;
  value: string;
}

export function MetricRow({ label, value }: MetricRowProps) {
  return (
    <SurfaceCard contentPadding={0} radius="sm" style={styles.card} variant="profileRow">
      <View style={styles.row}>
        <Typography
          color={figmaV2Reference.text.heading}
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.label}
          variant="Body"
        >
          {label}
        </Typography>
        <Typography
          color={figmaV2Reference.text.heading}
          numberOfLines={1}
          style={styles.value}
          variant="Body"
          weight="bold"
        >
          {value}
        </Typography>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 0.8,
    height: PROFILE_ROW_HEIGHT,
  },
  label: {
    flex: 1,
    paddingRight: 8,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    height: PROFILE_ROW_HEIGHT,
    justifyContent: 'space-between',
    paddingBottom: PROFILE_ROW_PAD_BOTTOM,
    paddingHorizontal: PROFILE_ROW_PAD_X,
    paddingTop: PROFILE_ROW_PAD_TOP,
  },
  value: {
    flexShrink: 0,
    textAlign: 'right',
  },
});
