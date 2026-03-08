import { StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { Typography } from '../../../components/Typography';
import { radii, sectionVisualThemes, spacing } from '../../../theme/tokens';

interface ReminderStatusNoticeProps {
  actionLabel?: string;
  detail: string;
  onAction?: () => void;
  tone: 'neutral' | 'success' | 'warning';
}

function resolveCardStyle(tone: ReminderStatusNoticeProps['tone']) {
  if (tone === 'success') {
    return {
      backgroundColor: sectionVisualThemes.live.surface.card[0],
      borderColor: sectionVisualThemes.live.surface.edge,
      textColor: sectionVisualThemes.live.nav.labelActive,
    };
  }

  if (tone === 'warning') {
    return {
      backgroundColor: 'rgba(180, 136, 82, 0.14)',
      borderColor: 'rgba(214, 168, 108, 0.46)',
      textColor: sectionVisualThemes.live.nav.labelActive,
    };
  }

  return {
    backgroundColor: sectionVisualThemes.live.surface.card[1],
    borderColor: sectionVisualThemes.live.surface.edge,
    textColor: sectionVisualThemes.live.nav.labelIdle,
  };
}

export function ReminderStatusNotice({
  actionLabel,
  detail,
  onAction,
  tone,
}: ReminderStatusNoticeProps) {
  const style = resolveCardStyle(tone);

  return (
    <View
      accessibilityLabel={`Reminder status. ${detail}`}
      accessibilityRole="text"
      style={[
        styles.card,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <Typography color={style.textColor} variant="Caption">
        {detail}
      </Typography>
      {actionLabel && onAction ? <Button onPress={onAction} title={actionLabel} variant="ghost" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});

export type { ReminderStatusNoticeProps };
