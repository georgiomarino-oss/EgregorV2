import { StyleSheet, View } from 'react-native';

import {
  PROFILE_ROW_HEIGHT,
  PROFILE_ROW_PAD_BOTTOM,
  PROFILE_ROW_PAD_TOP,
  PROFILE_ROW_PAD_X,
} from '../theme/layout';
import { profileSurface, radii } from '../theme/tokens';
import { Typography } from './Typography';

interface MetricRowProps {
  label: string;
  value: string;
}

export function MetricRow({ label, value }: MetricRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Typography
          color={profileSurface.metrics.sectionLabel}
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.label}
          variant="Body"
        >
          {label}
        </Typography>
        <Typography
          color={profileSurface.hero.metricValue}
          numberOfLines={1}
          style={styles.value}
          variant="Body"
          weight="bold"
        >
          {value}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: profileSurface.metrics.calloutBackground,
    borderColor: profileSurface.metrics.calloutBorder,
    borderRadius: radii.md,
    borderWidth: 0.8,
    height: PROFILE_ROW_HEIGHT,
    overflow: 'hidden',
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
