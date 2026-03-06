import type { MaterialCommunityIcons } from '@expo/vector-icons';

import { EmptyStateCard } from '../../../components/EmptyStateCard';
import { circleSurface } from '../../../theme/tokens';

type CircleVariant = 'prayer' | 'events';

interface CircleEmptyStateProps {
  body: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  variant: CircleVariant;
}

export function CircleEmptyState({ body, iconName, title, variant }: CircleEmptyStateProps) {
  const palette = circleSurface[variant].empty;

  return (
    <EmptyStateCard
      backgroundColor={palette.panelBackground}
      body={body}
      bodyColor={palette.body}
      borderColor={palette.panelBorder}
      iconBackgroundColor={palette.iconBackground}
      iconBorderColor={palette.iconBorder}
      iconName={iconName}
      iconTint={palette.iconTint}
      title={title}
      titleColor={palette.title}
    />
  );
}
