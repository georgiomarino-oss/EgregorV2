import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { SectionThemeKey } from '../theme/tokens';
import {
  compositionRhythm,
  premiumHalo,
  premiumInteraction,
  premiumSurfaceDepth,
  radii,
  sectionVisualThemes,
  spacing,
  typographyHierarchy,
} from '../theme/tokens';
import { Typography } from './Typography';

type CinematicTone = 'circle' | 'hero' | 'liveEvent' | 'prayer' | 'profileTrust';

interface CinematicSurfaceProps {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  artSource?: ImageSourcePropType;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fallbackIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  fallbackLabel?: string;
  footer?: ReactNode;
  onPress?: () => void;
  section: SectionThemeKey;
  style?: StyleProp<ViewStyle>;
  tone: CinematicTone;
}

const toneConfig: Record<
  CinematicTone,
  {
    artHeight: number;
    borderRadius: number;
    gradientKey: 'card' | 'hero';
    minHeight: number;
    shadow: (typeof premiumSurfaceDepth)[keyof typeof premiumSurfaceDepth];
  }
> = {
  circle: {
    artHeight: 102,
    borderRadius: radii.lg,
    gradientKey: 'card',
    minHeight: 156,
    shadow: premiumSurfaceDepth.tier1,
  },
  hero: {
    artHeight: 136,
    borderRadius: radii.xl,
    gradientKey: 'hero',
    minHeight: 188,
    shadow: premiumSurfaceDepth.tier3,
  },
  liveEvent: {
    artHeight: 116,
    borderRadius: radii.lg,
    gradientKey: 'card',
    minHeight: 210,
    shadow: premiumSurfaceDepth.tier2,
  },
  prayer: {
    artHeight: 112,
    borderRadius: radii.lg,
    gradientKey: 'card',
    minHeight: 210,
    shadow: premiumSurfaceDepth.tier2,
  },
  profileTrust: {
    artHeight: 108,
    borderRadius: radii.lg,
    gradientKey: 'card',
    minHeight: 164,
    shadow: premiumSurfaceDepth.tier2,
  },
};

function CinematicSurface({
  accessibilityHint,
  accessibilityLabel,
  artSource,
  children,
  contentStyle,
  fallbackIcon = 'creation-outline',
  fallbackLabel,
  footer,
  onPress,
  section,
  style,
  tone,
}: CinematicSurfaceProps) {
  const palette = sectionVisualThemes[section];
  const config = toneConfig[tone];
  const interactive = Boolean(onPress);
  const baseCardStyle = [
    styles.card,
    config.shadow,
    {
      borderColor: palette.surface.border,
      borderRadius: config.borderRadius,
      minHeight: config.minHeight,
    },
    style,
  ];
  const content = (
    <>
      <LinearGradient
        colors={palette.surface[config.gradientKey]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.innerHalo,
          { backgroundColor: palette.surface.halo, borderRadius: config.borderRadius },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.edgeHighlight,
          {
            borderColor: palette.surface.edge,
            borderRadius: config.borderRadius,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.upperEdge,
          {
            backgroundColor: premiumHalo.edgeFaint,
            borderTopLeftRadius: config.borderRadius,
            borderTopRightRadius: config.borderRadius,
          },
        ]}
      />

      <View
        style={[
          styles.mediaSlot,
          {
            borderColor: palette.media.frameBorder,
            height: config.artHeight,
          },
        ]}
      >
        {artSource ? (
          <Image resizeMode="cover" source={artSource} style={styles.mediaImage} />
        ) : (
          <LinearGradient
            colors={palette.media.fallback}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.mediaFallback}
          >
            <View style={[styles.mediaIconWrap, { borderColor: palette.media.frameBorder }]}>
              <MaterialCommunityIcons color={palette.media.icon} name={fallbackIcon} size={22} />
            </View>
            {fallbackLabel ? (
              <Typography color={palette.media.icon} style={styles.fallbackLabel} variant="Caption">
                {fallbackLabel}
              </Typography>
            ) : null}
          </LinearGradient>
        )}
        <LinearGradient
          colors={palette.media.scrim}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.content, contentStyle]}>
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </>
  );

  if (!interactive) {
    return <View style={baseCardStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        ...baseCardStyle,
        pressed
          ? {
              opacity: premiumInteraction.pressed.opacity,
              transform: [{ scale: premiumInteraction.pressed.scale }],
            }
          : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

interface PrimitiveBaseProps extends Omit<CinematicSurfaceProps, 'tone'> {}

export function PremiumHeroPanel(props: PrimitiveBaseProps) {
  return <CinematicSurface {...props} tone="hero" />;
}

export function PremiumPrayerCardSurface(props: PrimitiveBaseProps) {
  return <CinematicSurface {...props} tone="prayer" />;
}

export function PremiumLiveEventCardSurface(props: PrimitiveBaseProps) {
  return <CinematicSurface {...props} tone="liveEvent" />;
}

export function PremiumCircleCardSurface(props: PrimitiveBaseProps) {
  return <CinematicSurface {...props} tone="circle" />;
}

export function PremiumProfileTrustCardSurface(props: PrimitiveBaseProps) {
  return <CinematicSurface {...props} tone="profileTrust" />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: compositionRhythm.card.contentGap,
    overflow: 'hidden',
    padding: spacing.sm,
    position: 'relative',
  },
  content: {
    gap: compositionRhythm.card.contentGap,
  },
  edgeHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  fallbackLabel: {
    lineHeight: typographyHierarchy.cardBody.lineHeight,
    opacity: 0.86,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xxs,
  },
  innerHalo: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.74,
  },
  mediaFallback: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  mediaIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
    height: undefined,
    width: undefined,
  },
  mediaSlot: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  upperEdge: {
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export type { CinematicSurfaceProps };
