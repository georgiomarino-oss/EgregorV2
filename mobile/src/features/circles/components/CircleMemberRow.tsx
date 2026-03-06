import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { PrayerCircleMember } from '../../../lib/api/data';
import { circleSurface, interaction, motion, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';
import { Typography } from '../../../components/Typography';

type CircleVariant = 'prayer' | 'events';

interface CircleMemberRowProps {
  member: PrayerCircleMember;
  onRemovePress: (member: PrayerCircleMember) => void;
  orderIndex?: number;
  updating?: boolean;
  variant: CircleVariant;
}

const REMOVE_ACTION_WIDTH = 76;

function resolveJoinedLabel(joinedAt: string) {
  const joinedTime = Date.parse(joinedAt);
  if (Number.isNaN(joinedTime)) {
    return 'Joined recently';
  }

  const diffMs = Date.now() - joinedTime;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return 'Joined today';
  }
  if (diffDays === 1) {
    return 'Joined 1 day ago';
  }
  if (diffDays < 30) {
    return `Joined ${diffDays} days ago`;
  }

  return 'Joined earlier';
}

export function CircleMemberRow({
  member,
  onRemovePress,
  orderIndex = 0,
  updating = false,
  variant,
}: CircleMemberRowProps) {
  const reduceMotionEnabled = useReducedMotion();
  const palette = circleSurface[variant].member;
  const removePalette = circleSurface[variant].removeAction;
  const translateX = useMemo(() => new Animated.Value(0), []);
  const reveal = useMemo(() => new Animated.Value(0), []);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (reduceMotionEnabled) {
      reveal.setValue(1);
      return;
    }

    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      delay: Math.min(orderIndex, 8) * 38,
      duration: motion.durationMs.base,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [orderIndex, reduceMotionEnabled, reveal]);

  const closeRow = useCallback(() => {
    setIsOpen(false);
    Animated.spring(translateX, {
      bounciness: 0,
      speed: 16,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const openRow = useCallback(() => {
    setIsOpen(true);
    Animated.spring(translateX, {
      bounciness: 0,
      speed: 16,
      toValue: -REMOVE_ACTION_WIDTH,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (member.isOwner || updating) {
            return false;
          }
          return (
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6
          );
        },
        onPanResponderMove: (_event, gestureState) => {
          const base = isOpen ? -REMOVE_ACTION_WIDTH : 0;
          const next = Math.max(-REMOVE_ACTION_WIDTH, Math.min(0, base + gestureState.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldOpen =
            gestureState.vx < -0.35 ||
            (!isOpen && gestureState.dx < -36) ||
            (isOpen && gestureState.dx < 14);

          if (shouldOpen) {
            openRow();
            return;
          }

          closeRow();
        },
        onPanResponderTerminate: () => {
          if (isOpen) {
            openRow();
            return;
          }
          closeRow();
        },
      }),
    [closeRow, isOpen, member.isOwner, openRow, translateX, updating],
  );

  const revealStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: reveal.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        }),
        transform: [
          {
            translateY: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      };

  return (
    <Animated.View style={revealStyle}>
      <View style={styles.swipeRowWrap}>
        {!member.isOwner ? (
          <View style={styles.removeActionContainer}>
            <Pressable
              accessibilityHint={
                member.isOwner ? undefined : `Removes ${member.displayName} from this circle.`
              }
              accessibilityLabel={member.isOwner ? 'Circle owner' : `Remove ${member.displayName}`}
              accessibilityRole="button"
              accessibilityState={{ busy: updating, disabled: updating }}
              disabled={updating}
              hitSlop={6}
              onPress={() => {
                closeRow();
                onRemovePress(member);
              }}
              style={({ pressed }) => [
                styles.removeActionButton,
                {
                  backgroundColor: removePalette.background,
                  borderColor: removePalette.border,
                },
                !reduceMotionEnabled && pressed && styles.removePressed,
                updating && styles.disabled,
              ]}
            >
              <MaterialCommunityIcons color={removePalette.icon} name="minus" size={18} />
            </Pressable>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.swipeContent,
            {
              transform: [{ translateX }],
            },
          ]}
          {...(member.isOwner || updating ? {} : panResponder.panHandlers)}
        >
          <View
            accessibilityLabel={`${member.displayName}. ${member.isOwner ? 'Circle owner' : resolveJoinedLabel(member.joinedAt)}`}
            accessibilityRole="summary"
            accessible
            style={[
              styles.memberCard,
              {
                backgroundColor: palette.rowBackground,
                borderColor: palette.rowBorder,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: palette.avatarBackground,
                  borderColor: palette.avatarBorder,
                },
              ]}
            >
              <Typography
                allowFontScaling={false}
                color={palette.avatarText}
                variant="Caption"
                weight="bold"
              >
                {member.displayName.slice(0, 1).toUpperCase()}
              </Typography>
            </View>

            <View style={styles.memberTextWrap}>
              <Typography
                allowFontScaling={false}
                color={palette.rowName}
                numberOfLines={1}
                variant="Body"
                weight="bold"
              >
                {member.displayName}
              </Typography>
              <Typography
                allowFontScaling={false}
                color={palette.rowMeta}
                numberOfLines={1}
                variant="Caption"
              >
                {member.isOwner ? 'Circle owner' : resolveJoinedLabel(member.joinedAt)}
              </Typography>
            </View>

            <View
              style={[
                styles.rolePill,
                {
                  backgroundColor: palette.roleBackground,
                  borderColor: palette.roleBorder,
                },
              ]}
            >
              <Typography
                allowFontScaling={false}
                color={palette.roleText}
                variant="Caption"
                weight="bold"
              >
                {member.isOwner ? 'Owner' : 'Member'}
              </Typography>
            </View>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  disabled: {
    opacity: interaction.button.disabledOpacity,
  },
  memberCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  memberTextWrap: {
    flex: 1,
    gap: 2,
  },
  noMotion: {
    opacity: 1,
  },
  removeActionButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  removeActionContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: REMOVE_ACTION_WIDTH,
  },
  removePressed: {
    transform: [{ scale: interaction.iconButton.pressedScale }],
  },
  rolePill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  swipeContent: {
    borderRadius: radii.md,
  },
  swipeRowWrap: {
    borderRadius: radii.md,
    minHeight: 52,
    overflow: 'hidden',
    position: 'relative',
  },
});
