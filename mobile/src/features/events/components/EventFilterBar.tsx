import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Typography } from '../../../components/Typography';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { eventsSurface, interaction, motion, radii, spacing } from '../../../theme/tokens';
import type { CategoryFilter, EventTimeFilter } from '../types';

function FilterChip({
  active,
  fill = false,
  icon,
  label,
  onPress,
  size = 'md',
}: {
  active: boolean;
  fill?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'md' | 'sm';
}) {
  const reduceMotionEnabled = useReducedMotion();
  const [emphasis] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    if (reduceMotionEnabled) {
      emphasis.setValue(active ? 1 : 0);
      return;
    }

    const animation = Animated.timing(emphasis, {
      duration: motion.durationMs.base,
      easing: Easing.out(Easing.cubic),
      toValue: active ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [active, emphasis, reduceMotionEnabled]);

  const motionStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: emphasis.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
        transform: [
          {
            scale: emphasis.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        accessibilityHint="Filters visible events."
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.chipBase,
          size === 'sm' ? styles.chipSm : styles.chipMd,
          fill && styles.chipFill,
          active ? styles.chipActive : styles.chipInactive,
          !reduceMotionEnabled && pressed && styles.chipPressed,
        ]}
      >
        <View style={styles.chipContentRow}>
          {icon ? (
            <MaterialCommunityIcons
              color={active ? eventsSurface.filter.chipActiveText : eventsSurface.filter.chipText}
              name={icon}
              size={14}
            />
          ) : null}
          <Typography
            allowFontScaling={false}
            color={active ? eventsSurface.filter.chipActiveText : eventsSurface.filter.chipText}
            style={styles.chipText}
            variant="Caption"
            weight="bold"
          >
            {label}
          </Typography>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface EventFilterBarProps {
  categoryFilters: string[];
  liveFilterCount: number;
  onCategoryPress: (category: string) => void;
  onTimeFilterPress: (filter: Exclude<EventTimeFilter, null>) => void;
  selectedCategory: CategoryFilter;
  timeFilter: EventTimeFilter;
  todayFilterCount: number;
  tomorrowFilterCount: number;
}

export function EventFilterBar({
  categoryFilters,
  liveFilterCount,
  onCategoryPress,
  onTimeFilterPress,
  selectedCategory,
  timeFilter,
  todayFilterCount,
  tomorrowFilterCount,
}: EventFilterBarProps) {
  return (
    <View style={styles.filterShell}>
      <View style={styles.topFilterRow}>
        <FilterChip
          active={timeFilter === 'live'}
          fill
          icon="broadcast"
          label={`Live (${liveFilterCount})`}
          onPress={() => onTimeFilterPress('live')}
        />
        <FilterChip
          active={timeFilter === 'today'}
          fill
          icon="calendar-today"
          label={`Today (${todayFilterCount})`}
          onPress={() => onTimeFilterPress('today')}
        />
        <FilterChip
          active={timeFilter === 'tomorrow'}
          fill
          icon="calendar-clock"
          label={`Tomorrow (${tomorrowFilterCount})`}
          onPress={() => onTimeFilterPress('tomorrow')}
        />
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryRail}
        showsHorizontalScrollIndicator={false}
      >
        {categoryFilters.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategory === category}
            label={category}
            onPress={() => onCategoryPress(category)}
            size="sm"
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryRail: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: eventsSurface.filter.chipActiveBackground,
    borderColor: eventsSurface.filter.chipActiveBorder,
  },
  chipBase: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  chipContentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  chipFill: {
    flex: 1,
    minWidth: 0,
  },
  chipInactive: {
    backgroundColor: eventsSurface.filter.chipBackground,
    borderColor: eventsSurface.filter.chipBorder,
    opacity: interaction.chip.inactiveOpacity,
  },
  chipMd: {
    minHeight: 36,
  },
  chipPressed: {
    transform: [{ scale: interaction.chip.pressedScale }],
  },
  chipSm: {
    minHeight: 30,
    minWidth: 68,
  },
  chipText: {
    lineHeight: 14,
    textTransform: 'none',
  },
  filterShell: {
    backgroundColor: eventsSurface.filter.shellBackground,
    borderColor: eventsSurface.filter.shellBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  noMotion: {
    opacity: 1,
  },
  topFilterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
