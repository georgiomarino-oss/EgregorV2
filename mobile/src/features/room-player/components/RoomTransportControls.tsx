import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SurfaceCard } from '../../../components/SurfaceCard';
import { Typography } from '../../../components/Typography';
import { colors, interaction, motion } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface RoomTransportControlsStyles {
  bottomActionsRow?: StyleProp<ViewStyle>;
  bottomBlock?: StyleProp<ViewStyle>;
  bottomIconAction?: StyleProp<ViewStyle>;
  dropdownOptionPressed?: StyleProp<ViewStyle>;
  inviteButton?: StyleProp<ViewStyle>;
  inviteIconCircle?: StyleProp<ViewStyle>;
  inviteMenu?: StyleProp<ViewStyle>;
  inviteOption?: StyleProp<ViewStyle>;
  inviteText?: StyleProp<TextStyle>;
  progressFill?: StyleProp<ViewStyle>;
  progressLabels?: StyleProp<ViewStyle>;
  progressTrack?: StyleProp<ViewStyle>;
  selectorPressed?: StyleProp<ViewStyle>;
}

interface RoomTransportControlsProps {
  inviteOptions?: string[];
  isInviteOpen: boolean;
  isMuted: boolean;
  isRunning?: boolean;
  leftLabel: string;
  onReset: () => void;
  onSelectInviteOption?: (option: string) => void;
  onToggleInvite: () => void;
  onToggleMute: () => void;
  progress: number;
  rightLabel: string;
  styles?: RoomTransportControlsStyles;
}

const DEFAULT_INVITE_OPTIONS = ['Invite your circle', 'Copy invite link', 'Share externally'];
const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

export function RoomTransportControls({
  inviteOptions = DEFAULT_INVITE_OPTIONS,
  isInviteOpen,
  isMuted,
  isRunning = false,
  leftLabel,
  onReset,
  onSelectInviteOption,
  onToggleInvite,
  onToggleMute,
  progress,
  rightLabel,
  styles,
}: RoomTransportControlsProps) {
  const reduceMotionEnabled = useReducedMotion();
  const [progressValue] = useState(() => new Animated.Value(clampUnit(progress)));
  const [runningEmphasis] = useState(() => new Animated.Value(isRunning ? 1 : 0));
  const [statePulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const clampedProgress = clampUnit(progress);
    if (reduceMotionEnabled) {
      progressValue.setValue(clampedProgress);
      return;
    }

    const animation = Animated.timing(progressValue, {
      duration: motion.durationMs.base,
      easing: Easing.out(Easing.cubic),
      toValue: clampedProgress,
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [progress, progressValue, reduceMotionEnabled]);

  useEffect(() => {
    if (reduceMotionEnabled) {
      runningEmphasis.setValue(isRunning ? 1 : 0);
      return;
    }

    const animation = Animated.timing(runningEmphasis, {
      duration: motion.durationMs.base,
      easing: Easing.out(Easing.cubic),
      toValue: isRunning ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [isRunning, reduceMotionEnabled, runningEmphasis]);

  useEffect(() => {
    if (reduceMotionEnabled) {
      statePulse.setValue(0);
      return;
    }

    statePulse.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(statePulse, {
        duration: motion.durationMs.fast,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(statePulse, {
        duration: motion.durationMs.slow,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [isRunning, reduceMotionEnabled, statePulse]);

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const trackMotionStyle = reduceMotionEnabled
    ? localStyles.noMotion
    : {
        opacity: statePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
        transform: [
          {
            scale: runningEmphasis.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  return (
    <View style={styles?.bottomBlock}>
      <Animated.View style={trackMotionStyle}>
        <View style={styles?.progressTrack}>
          <Animated.View style={[styles?.progressFill, { width: progressWidth }]} />
        </View>
      </Animated.View>

      <View style={[styles?.progressLabels, localStyles.progressLabelsRow]}>
        <Typography
          allowFontScaling={false}
          numberOfLines={1}
          style={localStyles.progressLabelLeft}
          variant="H2"
          weight="bold"
        >
          {leftLabel}
        </Typography>
        <Typography
          allowFontScaling={false}
          numberOfLines={1}
          style={localStyles.progressLabelRight}
          variant="H2"
          weight="bold"
        >
          {rightLabel}
        </Typography>
      </View>

      {isInviteOpen ? (
        <SurfaceCard radius="md" style={styles?.inviteMenu}>
          {inviteOptions.map((option) => (
            <Pressable
              accessibilityLabel={option}
              accessibilityRole="button"
              key={option}
              onPress={(event) => {
                event.stopPropagation();
                onSelectInviteOption?.(option);
              }}
              style={({ pressed }) => [
                styles?.inviteOption,
                !reduceMotionEnabled && pressed && styles?.dropdownOptionPressed,
              ]}
            >
              <Typography allowFontScaling={false} variant="Body" weight="bold">
                {option}
              </Typography>
            </Pressable>
          ))}
        </SurfaceCard>
      ) : null}

      <View style={styles?.bottomActionsRow}>
        <Pressable
          accessibilityHint="Toggles room audio output."
          accessibilityLabel={isMuted ? 'Unmute room audio' : 'Mute room audio'}
          accessibilityRole="button"
          accessibilityState={{ selected: isMuted }}
          onPress={onToggleMute}
          style={({ pressed }) => [
            styles?.bottomIconAction,
            !reduceMotionEnabled && pressed && styles?.selectorPressed,
            !reduceMotionEnabled && pressed && localStyles.pressedFeedback,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name={isMuted ? 'volume-off' : 'volume-high'}
            size={28}
          />
          <Typography
            allowFontScaling={false}
            color={colors.textSecondary}
            variant="Body"
            weight="bold"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </Typography>
        </Pressable>

        <Pressable
          accessibilityHint="Returns playback to the beginning."
          accessibilityLabel="Reset playback"
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [
            styles?.bottomIconAction,
            !reduceMotionEnabled && pressed && styles?.selectorPressed,
            !reduceMotionEnabled && pressed && localStyles.pressedFeedback,
          ]}
        >
          <MaterialCommunityIcons color={colors.textPrimary} name="restore" size={28} />
          <Typography
            allowFontScaling={false}
            color={colors.textSecondary}
            variant="Body"
            weight="bold"
          >
            Reset
          </Typography>
        </Pressable>

        <Pressable
          accessibilityHint="Opens invite options for this room."
          accessibilityLabel="Invite options"
          accessibilityRole="button"
          accessibilityState={{ expanded: isInviteOpen }}
          onPress={(event) => {
            event.stopPropagation();
            onToggleInvite();
          }}
          style={({ pressed }) => [
            styles?.inviteButton,
            !reduceMotionEnabled && pressed && styles?.selectorPressed,
            !reduceMotionEnabled && pressed && localStyles.pressedFeedback,
          ]}
        >
          <View style={styles?.inviteIconCircle}>
            <MaterialCommunityIcons color={colors.textPrimary} name="account-group" size={15} />
          </View>
          <Typography
            allowFontScaling={false}
            style={styles?.inviteText}
            variant="H2"
            weight="bold"
          >
            Invite
          </Typography>
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name={isInviteOpen ? 'chevron-down' : 'chevron-up'}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  noMotion: {
    opacity: 1,
  },
  progressLabelLeft: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'left',
  },
  progressLabelRight: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'right',
  },
  progressLabelsRow: {
    alignItems: 'center',
    columnGap: 10,
  },
  pressedFeedback: {
    opacity: interaction.subtlePressOpacity,
  },
});
