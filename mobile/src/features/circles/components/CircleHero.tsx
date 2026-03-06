import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Typography } from '../../../components/Typography';
import { circleSurface, motion, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

type CircleVariant = 'prayer' | 'events';

interface CircleHeroProps {
  memberCount: number;
  subtitle: string;
  title: string;
  variant: CircleVariant;
}

const iconByVariant: Record<CircleVariant, keyof typeof MaterialCommunityIcons.glyphMap> = {
  events: 'earth',
  prayer: 'hands-pray',
};

const badgeByVariant: Record<CircleVariant, string> = {
  events: 'Events circle',
  prayer: 'Prayer circle',
};

function getMemberStateLabel(memberCount: number) {
  if (memberCount <= 0) {
    return 'Start with one trusted connection';
  }

  if (memberCount === 1) {
    return 'One member in your circle';
  }

  return `${memberCount} members in your circle`;
}

export function CircleHero({ memberCount, subtitle, title, variant }: CircleHeroProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);
  const palette = circleSurface[variant].hero;

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.durationMs.ritual,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, settle]);

  const settleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: settle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={settleStyle}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: palette.panelBackground,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[palette.panelGradientFrom, palette.panelGradientTo]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: palette.glow }]} />

        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: palette.badgeBackground,
                borderColor: palette.badgeBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={palette.iconTint}
              name={iconByVariant[variant]}
              size={16}
            />
            <Typography
              allowFontScaling={false}
              color={palette.badgeText}
              style={styles.badgeText}
              variant="Caption"
              weight="bold"
            >
              {badgeByVariant[variant]}
            </Typography>
          </View>

          <View
            style={[
              styles.statPill,
              {
                backgroundColor: palette.statBackground,
                borderColor: palette.statBorder,
              },
            ]}
          >
            <Typography
              allowFontScaling={false}
              color={palette.statValue}
              variant="Body"
              weight="bold"
            >
              {memberCount}
            </Typography>
            <Typography allowFontScaling={false} color={palette.statLabel} variant="Caption">
              members
            </Typography>
          </View>
        </View>

        <Typography
          accessibilityRole="header"
          allowFontScaling={false}
          style={[styles.title, { textShadowColor: palette.titleGlow }]}
          variant="H1"
          weight="bold"
        >
          {title}
        </Typography>
        <Typography allowFontScaling={false} color={palette.subtitle} style={styles.subtitle}>
          {subtitle}
        </Typography>

        <View
          style={[
            styles.memberContext,
            {
              backgroundColor: palette.statBackground,
              borderColor: palette.statBorder,
            },
          ]}
        >
          <Typography
            allowFontScaling={false}
            color={palette.statLabel}
            variant="Caption"
            weight="bold"
          >
            {getMemberStateLabel(memberCount)}
          </Typography>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    textTransform: 'none',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  memberContext: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  noMotion: {
    opacity: 1,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statPill: {
    alignItems: 'flex-end',
    borderRadius: radii.pill,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: '96%',
  },
  title: {
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 15,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
