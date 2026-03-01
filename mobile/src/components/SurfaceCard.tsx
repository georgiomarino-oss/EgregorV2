import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { colors, radii, spacing } from '../theme/tokens';

interface SurfaceCardProps extends ViewProps {
  children: ReactNode;
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'soft' | 'warm';
  variant?:
    | 'default'
    | 'authForm'
    | 'homeStat'
    | 'homeStatSmall'
    | 'homeAlert'
    | 'profileImpact'
    | 'profileRow'
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
  warm: 'rgba(63,53,40,0.72)',
} as const;

const surfaceRecipeMap = {
  authForm: figmaV2Reference.surfaces.authForm,
  default: figmaV2Reference.surfaces.default,
  eventRoomCurrent: figmaV2Reference.surfaces.eventRoomCurrent,
  homeAlert: figmaV2Reference.surfaces.homeAlert,
  homeStat: figmaV2Reference.surfaces.homeStatCard,
  homeStatSmall: figmaV2Reference.surfaces.homeStatSmall,
  profileImpact: figmaV2Reference.surfaces.profileImpactCard,
  profileRow: figmaV2Reference.surfaces.profileRow,
} as const;

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

function SurfaceRadials({
  radials,
  variant,
}: {
  radials: readonly {
    matrix: string;
    stops: readonly { color: string; offset: number }[];
  }[];
  variant: string;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 565.74 353" width="100%">
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
                {radial.stops.map((stop, stopIndex) => (
                  <Stop
                    key={`${gradientId}-stop-${stopIndex}`}
                    offset={`${stop.offset * 100}%`}
                    stopColor={stop.color}
                  />
                ))}
              </RadialGradient>
            );
          })}
        </Defs>
        {radials.map((_radial, index) => (
          <Rect
            fill={`url(#${variant}-surface-radial-${index})`}
            height="353"
            key={`${variant}-surface-rect-${index}`}
            width="565.74"
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
  radius = 'lg',
  style,
  tone = 'default',
  variant = 'default',
  ...props
}: SurfaceCardProps) {
  const recipe = surfaceRecipeMap[variant];
  const layer = hasLayer(recipe) ? recipe.layer : undefined;
  const linearPoints = layer?.linear ? cssAngleToLinearPoints(layer.linear.angleDeg) : null;
  const fallbackColor =
    variant === 'default'
      ? toneMap[tone]
      : hasBackgroundColor(recipe)
        ? recipe.backgroundColor
        : colors.surface;

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          borderColor: recipe.borderColor,
          borderRadius: radiusMap[radius],
          borderWidth: recipe.borderWidth ?? 0.8,
        },
        style,
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

      {layer?.radials ? <SurfaceRadials radials={layer.radials} variant={variant} /> : null}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: spacing.md,
    position: 'relative',
  },
  content: {
    gap: 0,
  },
});
