import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference, type FigmaGradientLayerRecipe } from '../theme/figma-v2-reference';

type CosmicBackgroundVariant = 'auth' | 'home' | 'solo' | 'events' | 'profile';

interface CosmicBackgroundProps {
  ambientSource?: AnimationObject | { uri: string } | string;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  useAmbient?: boolean;
  variant?: CosmicBackgroundVariant;
}

const recipeByVariant: Record<CosmicBackgroundVariant, FigmaGradientLayerRecipe> = {
  auth: figmaV2Reference.backgrounds.auth,
  events: figmaV2Reference.backgrounds.events,
  home: figmaV2Reference.backgrounds.home,
  profile: figmaV2Reference.backgrounds.profile,
  solo: figmaV2Reference.backgrounds.solo,
};

function RadialLayer({ recipe, variant }: { recipe: FigmaGradientLayerRecipe; variant: string }) {
  if (!recipe.radials?.length) {
    return null;
  }

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
  ambientSource,
  children,
  contentStyle,
  useAmbient = true,
  variant = 'home',
}: CosmicBackgroundProps) {
  const recipe = recipeByVariant[variant];
  const linearPoints = recipe.linear
    ? cssAngleToLinearPoints(recipe.linear.angleDeg)
    : cssAngleToLinearPoints(180);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={recipe.linear?.colors ?? figmaV2Reference.backgrounds.home.linear.colors}
        end={linearPoints.end}
        locations={recipe.linear?.locations ?? figmaV2Reference.backgrounds.home.linear.locations}
        start={linearPoints.start}
        style={StyleSheet.absoluteFill}
      />

      <RadialLayer recipe={recipe} variant={variant} />

      {useAmbient && ambientSource ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LottieView autoPlay loop source={ambientSource} style={styles.ambient} />
        </View>
      ) : null}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    flex: 1,
    opacity: 0.15,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
