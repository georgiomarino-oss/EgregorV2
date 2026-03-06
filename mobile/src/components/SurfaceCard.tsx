import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { cardPaddingLg } from '../theme/layout';
import { parseRgba } from '../theme/svgStop';
import { colors, radii } from '../theme/tokens';

interface SurfaceCardProps extends ViewProps {
  children: ReactNode;
  contentPadding?: number | ViewStyle;
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'soft';
  variant?:
    | 'default'
    | 'authForm'
    | 'welcomeMain'
    | 'homeStat'
    | 'homeStatSmall'
    | 'authMeta'
    | 'homeAlert'
    | 'profileImpact'
    | 'profileRow'
    | 'eventsPanel'
    | 'eventRoomCurrent';
}

const radiusMap = {
  sm: radii.sm,
  md: radii.md,
  lg: radii.xl,
  xl: radii.hero,
} as const;

const toneMap = {
  default: colors.surface,
  soft: colors.surfaceStrong,
} as const;

const surfaceRecipeMap = {
  authForm: figmaV2Reference.surfaces.authForm,
  default: figmaV2Reference.surfaces.default,
  eventsPanel: figmaV2Reference.surfaces.eventsPanel,
  eventRoomCurrent: figmaV2Reference.surfaces.eventRoomCurrent,
  homeAlert: figmaV2Reference.surfaces.homeAlert,
  authMeta: figmaV2Reference.surfaces.authMetaCard,
  homeStat: figmaV2Reference.surfaces.homeStatCard,
  homeStatSmall: figmaV2Reference.surfaces.homeStatSmall,
  profileImpact: figmaV2Reference.surfaces.profileImpactCard,
  profileRow: figmaV2Reference.surfaces.profileRow,
  welcomeMain: figmaV2Reference.surfaces.welcomeMainCard,
} as const;
const SURFACE_BORDER_SOFTEN_FACTOR = 0.9;

type SurfaceRecipe = (typeof surfaceRecipeMap)[keyof typeof surfaceRecipeMap];

function hasLayer(recipe: SurfaceRecipe): recipe is SurfaceRecipe & {
  layer: {
    linear: {
      angleDeg: number;
      colors: readonly [string, string, ...string[]];
      locations: readonly [number, number, ...number[]];
    };
    radials?: readonly {
      matrix: string;
      stops: readonly { color: string; offset: number }[];
    }[];
  };
} {
  return 'layer' in recipe;
}

function hasBackgroundColor(
  recipe: SurfaceRecipe,
): recipe is SurfaceRecipe & { backgroundColor: string } {
  return 'backgroundColor' in recipe;
}

function getSvgSize(recipe: SurfaceRecipe) {
  const maybeSvg = (recipe as { svg?: { height?: number; width?: number } }).svg;
  const width = maybeSvg?.width;
  const height = maybeSvg?.height;

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { height, width };
}

function getRecipePadding(recipe: SurfaceRecipe) {
  const padding = (
    recipe as {
      padding?: number | { bottom?: number; top?: number; x?: number; y?: number };
    }
  ).padding;

  if (typeof padding === 'number' && Number.isFinite(padding) && padding >= 0) {
    return { paddingHorizontal: padding, paddingVertical: padding };
  }

  if (
    padding &&
    typeof padding === 'object' &&
    (Number.isFinite(padding.x) ||
      Number.isFinite(padding.y) ||
      Number.isFinite(padding.top) ||
      Number.isFinite(padding.bottom))
  ) {
    const x = Number.isFinite(padding.x) && (padding.x ?? 0) >= 0 ? padding.x : undefined;
    const y = Number.isFinite(padding.y) && (padding.y ?? 0) >= 0 ? padding.y : undefined;
    const top =
      Number.isFinite(padding.top) && (padding.top ?? 0) >= 0 ? padding.top : (y ?? cardPaddingLg);
    const bottom =
      Number.isFinite(padding.bottom) && (padding.bottom ?? 0) >= 0
        ? padding.bottom
        : (y ?? cardPaddingLg);

    return {
      paddingBottom: bottom,
      paddingHorizontal: x ?? cardPaddingLg,
      paddingTop: top,
    };
  }

  return { paddingHorizontal: cardPaddingLg, paddingVertical: cardPaddingLg };
}

function getRecipeSize(recipe: SurfaceRecipe) {
  const size = (recipe as { size?: { height?: number; minHeight?: number } }).size;

  if (!size || typeof size !== 'object') {
    return {};
  }

  const height =
    Number.isFinite(size.height) && (size.height ?? 0) > 0 ? { height: size.height } : {};
  const minHeight =
    Number.isFinite(size.minHeight) && (size.minHeight ?? 0) > 0
      ? { minHeight: size.minHeight }
      : {};

  return {
    ...height,
    ...minHeight,
  };
}

function SurfaceRadials({
  height,
  radials,
  variant,
  width,
}: {
  height: number;
  radials: readonly {
    matrix: string;
    stops: readonly { color: string; offset: number }[];
  }[];
  variant: string;
  width: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <Defs>
          {radials.map((radial, index) => {
            const gradientId = `${variant}-surface-radial-${index}`;

            return (
              <RadialGradient
                cx="0"
                cy="0"
                gradientTransform={radial.matrix}
                gradientUnits="userSpaceOnUse"
                id={gradientId}
                key={gradientId}
                r="10"
              >
                {radial.stops.map((stop, stopIndex) => {
                  const svgStop = parseRgba(stop.color);
                  const stopOpacityProps =
                    svgStop.stopOpacity === undefined ? {} : { stopOpacity: svgStop.stopOpacity };

                  return (
                    <Stop
                      key={`${gradientId}-stop-${stopIndex}`}
                      offset={`${stop.offset * 100}%`}
                      stopColor={svgStop.stopColor}
                      {...stopOpacityProps}
                    />
                  );
                })}
              </RadialGradient>
            );
          })}
        </Defs>
        {radials.map((_radial, index) => (
          <Rect
            fill={`url(#${variant}-surface-radial-${index})`}
            height={height}
            key={`${variant}-surface-rect-${index}`}
            width={width}
            x="0"
            y="0"
          />
        ))}
      </Svg>
    </View>
  );
}

export function SurfaceCard({
  children,
  contentPadding,
  radius = 'lg',
  style,
  tone = 'default',
  variant = 'default',
  ...props
}: SurfaceCardProps) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const { columnGap, gap, rowGap, ...cardStyle } = flattenedStyle;
  const contentGapStyle: ViewStyle = {
    ...(typeof gap === 'number' ? { gap } : {}),
    ...(typeof rowGap === 'number' ? { rowGap } : {}),
    ...(typeof columnGap === 'number' ? { columnGap } : {}),
  };

  const recipe = surfaceRecipeMap[variant];
  const layer = hasLayer(recipe) ? recipe.layer : undefined;
  const radialRecipes = layer?.radials;
  const svgSize = getSvgSize(recipe);
  const recipeSize = getRecipeSize(recipe);
  const recipePadding = getRecipePadding(recipe);
  const resolvedPadding =
    contentPadding === undefined
      ? recipePadding
      : typeof contentPadding === 'number'
        ? {
            paddingBottom: contentPadding,
            paddingHorizontal: contentPadding,
            paddingTop: contentPadding,
          }
        : contentPadding;
  const linearPoints = layer?.linear ? cssAngleToLinearPoints(layer.linear.angleDeg) : null;
  const fallbackColor =
    variant === 'default'
      ? toneMap[tone]
      : hasBackgroundColor(recipe)
        ? recipe.backgroundColor
        : colors.surface;
  const canRenderRadials = Boolean(radialRecipes?.length && svgSize);

  if (__DEV__ && radialRecipes?.length && !svgSize) {
    console.warn(
      `[SurfaceCard] Missing svg dimensions for radial surface variant "${variant}". Skipping radial layer.`,
    );
  }

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          borderColor: recipe.borderColor,
          borderRadius: radiusMap[radius],
          borderWidth: (recipe.borderWidth ?? 0.8) * SURFACE_BORDER_SOFTEN_FACTOR,
          ...recipeSize,
          ...resolvedPadding,
        },
        cardStyle,
      ]}
    >
      {linearPoints && layer?.linear ? (
        <LinearGradient
          colors={layer.linear.colors}
          end={linearPoints.end}
          locations={layer.linear.locations}
          start={linearPoints.start}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor }]}
        />
      )}

      {canRenderRadials && radialRecipes && svgSize ? (
        <SurfaceRadials
          height={svgSize.height}
          radials={radialRecipes}
          variant={variant}
          width={svgSize.width}
        />
      ) : null}
      <View style={[styles.content, contentGapStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    gap: 0,
  },
});
