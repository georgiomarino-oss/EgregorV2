import { useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { TimedWord } from '../../../lib/api/functions';
import { LoadingStateCard } from '../../../components/LoadingStateCard';
import { Typography } from '../../../components/Typography';
import { colors, motion } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface RoomScriptPanelProps {
  activeTimedWordIndex: number;
  activeTimedWords: TimedWord[] | null | undefined;
  fallbackParagraph: string;
  loading: boolean;
  loadingMessage: string;
  maxScriptLines: number;
  noScriptMessage: string;
  scriptText: string;
  scriptSyncWrapStyle?: StyleProp<ViewStyle>;
  scriptTextActiveStyle?: StyleProp<TextStyle>;
  scriptWordActiveStyle?: StyleProp<TextStyle>;
  scriptWordFlowStyle?: StyleProp<ViewStyle>;
  scriptWordStyle?: StyleProp<TextStyle>;
  scriptWrapStyle?: StyleProp<ViewStyle>;
}

export function RoomScriptPanel({
  activeTimedWordIndex,
  activeTimedWords,
  fallbackParagraph,
  loading,
  loadingMessage,
  maxScriptLines,
  noScriptMessage,
  scriptText,
  scriptSyncWrapStyle,
  scriptTextActiveStyle,
  scriptWordActiveStyle,
  scriptWordFlowStyle,
  scriptWordStyle,
  scriptWrapStyle,
}: RoomScriptPanelProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.room.solo.entryStageMs,
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
          outputRange: [0.82, 1],
        }),
        transform: [
          {
            translateY: settle.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      };

  const scriptAccessibilityLabel = loading
    ? loadingMessage
    : activeTimedWords && activeTimedWords.length > 0
      ? 'Guided script playback in progress.'
      : scriptText.trim().length > 0
        ? fallbackParagraph
        : noScriptMessage;

  return (
    <View
      accessibilityLabel={scriptAccessibilityLabel}
      accessibilityRole="summary"
      accessible
      style={scriptWrapStyle}
    >
      <Animated.View style={settleStyle}>
        {loading ? (
          <LoadingStateCard
            compact
            minHeight={92}
            subtitle="Preparing synchronized script playback."
            style={styles.loadingCard}
            title={loadingMessage}
          />
        ) : activeTimedWords && activeTimedWords.length > 0 ? (
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={scriptWordFlowStyle}
          >
            {activeTimedWords.map((word) => {
              const isActiveWord = word.index === activeTimedWordIndex;
              return (
                <Typography
                  key={`${word.index}-${word.startSeconds}-${word.word}`}
                  allowFontScaling={false}
                  style={[scriptWordStyle, isActiveWord && scriptWordActiveStyle]}
                  variant="H2"
                  weight={isActiveWord ? 'bold' : 'medium'}
                >
                  {`${word.word} `}
                </Typography>
              );
            })}
          </View>
        ) : scriptText.trim().length > 0 ? (
          <View style={scriptSyncWrapStyle}>
            <Typography
              allowFontScaling={false}
              numberOfLines={maxScriptLines}
              style={scriptTextActiveStyle}
              variant="H2"
              weight="bold"
            >
              {fallbackParagraph}
            </Typography>
          </View>
        ) : (
          <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
            {noScriptMessage}
          </Typography>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    width: '100%',
  },
  noMotion: {
    opacity: 1,
  },
});
