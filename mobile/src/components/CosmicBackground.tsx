import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Backgrounds, type BackgroundRecipe } from '../theme/figmaV2Backgrounds';

type CosmicBackgroundVariant = 'auth' | 'home' | 'solo' | 'events' | 'profile';

interface CosmicBackgroundProps {
  ambientSource?: unknown;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  useAmbient?: boolean;
  variant?: CosmicBackgroundVariant;
}

const recipeByVariant: Record<CosmicBackgroundVariant, BackgroundRecipe> = {
  auth: figmaV2Backgrounds.auth,
  events: figmaV2Backgrounds.events,
  home: figmaV2Backgrounds.home,
  profile: figmaV2Backgrounds.profile,
  solo: figmaV2Backgrounds.solo,
};

function RadialLayer({ recipe, variant }: { recipe: BackgroundRecipe; variant: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 605.34 806" width="100%">
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
        {recipe.radials.map((_radial, index) => (
          <Rect
            fill={`url(#${variant}-radial-${index})`}
            height="806"
            key={`${variant}-rect-${index}`}
            width="605.34"
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
