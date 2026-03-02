import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { parseRgba } from '../theme/svgStop';

type CosmicBackgroundVariant = 'auth' | 'home' | 'solo' | 'events' | 'eventRoom' | 'profile';

interface CosmicBackgroundProps {
  ambientSource?: unknown;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  useAmbient?: boolean;
  variant?: CosmicBackgroundVariant;
}

type BackgroundRecipe = (typeof figmaV2Reference.backgrounds)[CosmicBackgroundVariant];

const recipeByVariant: Record<CosmicBackgroundVariant, BackgroundRecipe> = {
  auth: figmaV2Reference.backgrounds.auth,
  eventRoom: figmaV2Reference.backgrounds.eventRoom,
  events: figmaV2Reference.backgrounds.events,
  home: figmaV2Reference.backgrounds.home,
  profile: figmaV2Reference.backgrounds.profile,
  solo: figmaV2Reference.backgrounds.solo,
};

function RadialLayer({ recipe, variant }: { recipe: BackgroundRecipe; variant: string }) {
  const { height, width } = recipe.svg;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <Defs>
          {recipe.radials.map((radial, index) => {
            const gradientId = `${variant}-radial-${index}`;

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
        {recipe.radials.map((_radial, index) => (
          <Rect
            fill={`url(#${variant}-radial-${index})`}
            height={height}
            key={`${variant}-rect-${index}`}
            width={width}
            x="0"
            y="0"
          />
        ))}
      </Svg>
    </View>
  );
}

export function CosmicBackground({
  ambientSource: _ambientSource,
  children,
  contentStyle,
  useAmbient: _useAmbient = true,
  variant = 'home',
}: CosmicBackgroundProps) {
  const recipe = recipeByVariant[variant];
  const linearPoints = cssAngleToLinearPoints(recipe.linear.angleDeg);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={recipe.linear.colors}
        end={linearPoints.end}
        locations={recipe.linear.locations}
        start={linearPoints.start}
        style={StyleSheet.absoluteFill}
      />

      <RadialLayer recipe={recipe} variant={variant} />

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
