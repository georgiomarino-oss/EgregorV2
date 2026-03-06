import { useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PanResponderInstance,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Typography } from '../../../components/Typography';
import { interaction, motion, profileSurface, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface JournalPanelProps {
  canGoPreviousPage: boolean;
  currentPageNumber: number;
  isSavingCurrentPage: boolean;
  onChangeText: (value: string) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageContent: string;
  pagePanHandlers: PanResponderInstance['panHandlers'];
  pageTurnOffset: Animated.Value;
  totalPages: number;
}

export function JournalPanel({
  canGoPreviousPage,
  currentPageNumber,
  isSavingCurrentPage,
  onChangeText,
  onNextPage,
  onPreviousPage,
  pageContent,
  pagePanHandlers,
  pageTurnOffset,
  totalPages,
}: JournalPanelProps) {
  const reduceMotionEnabled = useReducedMotion();
  const settle = useMemo(() => new Animated.Value(0), []);
  const savePulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      settle.setValue(1);
      return;
    }

    settle.setValue(0);
    const animation = Animated.timing(settle, {
      duration: motion.durationMs.slow,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, settle]);

  useEffect(() => {
    if (!isSavingCurrentPage || reduceMotionEnabled) {
      savePulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(savePulse, {
          duration: motion.durationMs.base,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(savePulse, {
          duration: motion.durationMs.base,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [isSavingCurrentPage, reduceMotionEnabled, savePulse]);

  const settleStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: settle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
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

  const savePulseStyle = reduceMotionEnabled
    ? styles.noMotion
    : {
        opacity: savePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
        transform: [
          {
            scale: savePulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  return (
    <Animated.View style={[styles.shell, settleStyle]}>
      <View pointerEvents="none" style={styles.shellGlow} />

      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons
            color={profileSurface.journal.title}
            name="notebook-outline"
            size={18}
          />
          <Typography
            allowFontScaling={false}
            color={profileSurface.journal.title}
            variant="H2"
            weight="bold"
          >
            Journal
          </Typography>
        </View>
        <Typography
          allowFontScaling={false}
          color={profileSurface.journal.pageMeta}
          variant="Caption"
          weight="bold"
        >
          {`Page ${currentPageNumber} of ${totalPages}`}
        </Typography>
      </View>

      <Animated.View
        style={[styles.page, { transform: [{ translateX: pageTurnOffset }] }]}
        {...pagePanHandlers}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.pageLinesOverlay}
        >
          {Array.from({ length: 7 }).map((_, lineIndex) => (
            <View key={`journal-line-${lineIndex}`} style={styles.pageLine} />
          ))}
        </View>

        <TextInput
          accessibilityHint="Double tap to edit your current journal page."
          accessibilityLabel={`Journal page ${currentPageNumber} of ${totalPages}`}
          multiline
          onChangeText={onChangeText}
          placeholder="Write your intentions, manifestations, or reflections..."
          placeholderTextColor={profileSurface.journal.placeholder}
          style={styles.input}
          textAlignVertical="top"
          value={pageContent}
        />

        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.pageCurl}
        />
      </Animated.View>

      <View style={styles.footer}>
        <Typography
          allowFontScaling={false}
          color={profileSurface.journal.hintText}
          variant="Caption"
        >
          Swipe left for a new page, swipe right for previous reflections.
        </Typography>
        <View style={styles.navButtons}>
          <Pressable
            accessibilityHint="Moves to the previous journal page."
            accessibilityLabel="Previous journal page"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoPreviousPage }}
            disabled={!canGoPreviousPage}
            onPress={onPreviousPage}
            style={({ pressed }) => [
              styles.navButton,
              !canGoPreviousPage && styles.navButtonDisabled,
              !reduceMotionEnabled && pressed && styles.navButtonPressed,
            ]}
          >
            <MaterialCommunityIcons
              color={profileSurface.journal.navButtonIcon}
              name="chevron-left"
              size={18}
            />
          </Pressable>
          <Pressable
            accessibilityHint="Moves to the next journal page."
            accessibilityLabel="Next journal page"
            accessibilityRole="button"
            onPress={onNextPage}
            style={({ pressed }) => [
              styles.navButton,
              !reduceMotionEnabled && pressed && styles.navButtonPressed,
            ]}
          >
            <MaterialCommunityIcons
              color={profileSurface.journal.navButtonIcon}
              name="chevron-right"
              size={18}
            />
          </Pressable>
        </View>
      </View>

      {isSavingCurrentPage ? (
        <Animated.View accessibilityLiveRegion="polite" style={[styles.savePill, savePulseStyle]}>
          <Typography
            allowFontScaling={false}
            color={profileSurface.journal.saveActiveText}
            variant="Caption"
            weight="bold"
          >
            Saving page...
          </Typography>
        </Animated.View>
      ) : (
        <Typography
          allowFontScaling={false}
          color={profileSurface.journal.saveIdleText}
          variant="Caption"
        >
          All changes saved
        </Typography>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    color: profileSurface.journal.title,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: profileSurface.journal.navButtonBackground,
    borderColor: profileSurface.journal.navButtonBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  navButtonDisabled: {
    opacity: interaction.button.disabledOpacity,
  },
  navButtonPressed: {
    transform: [{ scale: interaction.iconButton.pressedScale }],
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noMotion: {
    opacity: 1,
  },
  page: {
    backgroundColor: profileSurface.journal.pageBackground,
    borderColor: profileSurface.journal.pageBorder,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 208,
    overflow: 'hidden',
    position: 'relative',
  },
  pageCurl: {
    backgroundColor: profileSurface.journal.pageCurlBackground,
    borderBottomLeftRadius: radii.md,
    borderColor: profileSurface.journal.pageCurlBorder,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    height: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 24,
  },
  pageLine: {
    borderBottomColor: profileSurface.journal.pageLine,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 28,
  },
  pageLinesOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  savePill: {
    alignSelf: 'flex-start',
    backgroundColor: profileSurface.journal.saveActiveBackground,
    borderColor: profileSurface.journal.saveActiveBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  shell: {
    backgroundColor: profileSurface.journal.shellBackground,
    borderColor: profileSurface.journal.shellBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  shellGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: profileSurface.journal.shellGlow,
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
