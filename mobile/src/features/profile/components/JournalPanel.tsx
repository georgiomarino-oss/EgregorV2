import { useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type PanResponderInstance,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SectionHeader } from '../../../components/SectionHeader';
import { Typography } from '../../../components/Typography';
import { interaction, motion, profileSurface, radii, spacing } from '../../../theme/tokens';
import { useReducedMotion } from '../../rooms/hooks/useReducedMotion';

interface JournalEntryPreview {
  contentPreview: string;
  createdAt: string | null;
  isPersisted: boolean;
  localId: string;
  pageNumber: number;
  updatedAt: string | null;
}

interface JournalPanelProps {
  activeEntryLocalId: string | null;
  canCreateNewEntry: boolean;
  canGoPreviousPage: boolean;
  currentPageNumber: number;
  entries: JournalEntryPreview[];
  isSavingCurrentPage: boolean;
  onCreateEntry: () => void;
  onChangeText: (value: string) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSelectEntry: (localId: string) => void;
  pageContent: string;
  pagePanHandlers: PanResponderInstance['panHandlers'];
  pageTurnOffset: Animated.Value;
  saveStateLabel: string;
  saveStateTone: 'saved' | 'saving' | 'unsaved';
  totalPages: number;
}

function formatEntryDateLabel(input: string | null) {
  if (!input) {
    return 'Draft';
  }

  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    return 'Entry';
  }

  return value.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function toPreviewText(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'Start writing your reflection...';
  }

  if (compact.length <= 72) {
    return compact;
  }

  return `${compact.slice(0, 72).trim()}...`;
}

export function JournalPanel({
  activeEntryLocalId,
  canCreateNewEntry,
  canGoPreviousPage,
  currentPageNumber,
  entries,
  isSavingCurrentPage,
  onCreateEntry,
  onChangeText,
  onNextPage,
  onPreviousPage,
  onSelectEntry,
  pageContent,
  pagePanHandlers,
  pageTurnOffset,
  saveStateLabel,
  saveStateTone,
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
          outputRange: [0.75, 1],
        }),
        transform: [
          {
            scaleX: savePulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1 + motion.amplitude.subtle],
            }),
          },
        ],
      };

  const saveStateBadgeStyle =
    saveStateTone === 'unsaved'
      ? styles.saveStateUnsaved
      : saveStateTone === 'saving'
        ? styles.saveStateSaving
        : styles.saveStateSaved;

  return (
    <Animated.View style={[styles.shell, settleStyle]}>
      <LinearGradient
        colors={[profileSurface.journal.shellGradientFrom, profileSurface.journal.shellGradientTo]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.shellGlow} />

      <SectionHeader
        leading={
          <MaterialCommunityIcons
            color={profileSurface.journal.title}
            name="notebook-outline"
            size={18}
          />
        }
        subtitle="Capture the moment and revisit previous reflections."
        subtitleColor={profileSurface.journal.hintText}
        title="Journal"
        titleColor={profileSurface.journal.title}
        trailing={
          <View style={[styles.saveStatePill, saveStateBadgeStyle]}>
            <Typography
              allowFontScaling={false}
              color={
                saveStateTone === 'unsaved'
                  ? profileSurface.journal.saveUnsavedText
                  : profileSurface.journal.saveActiveText
              }
              variant="Caption"
              weight="bold"
            >
              {saveStateLabel}
            </Typography>
          </View>
        }
      />

      <View style={styles.entryMetaRow}>
        <Typography
          allowFontScaling={false}
          color={profileSurface.journal.pageMeta}
          variant="Caption"
          weight="bold"
        >
          {`Entry ${currentPageNumber} of ${totalPages}`}
        </Typography>
        <Pressable
          accessibilityHint="Creates a fresh journal entry and opens it."
          accessibilityLabel="Create new journal entry"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCreateNewEntry }}
          disabled={!canCreateNewEntry}
          onPress={onCreateEntry}
          style={({ pressed }) => [
            styles.newEntryButton,
            !canCreateNewEntry && styles.navButtonDisabled,
            !reduceMotionEnabled && pressed && styles.navButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            color={profileSurface.journal.newEntryText}
            name="plus"
            size={14}
          />
          <Typography
            allowFontScaling={false}
            color={profileSurface.journal.newEntryText}
            style={styles.newEntryText}
            variant="Caption"
            weight="bold"
          >
            New entry
          </Typography>
        </Pressable>
      </View>

      <View style={styles.historyShell}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.historyRail}
          showsHorizontalScrollIndicator={false}
        >
          {entries.map((entry) => {
            const isActive = entry.localId === activeEntryLocalId;
            const isDraft = !entry.isPersisted;

            return (
              <Pressable
                accessibilityHint="Opens this journal entry."
                accessibilityLabel={`Journal entry ${entry.pageNumber}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={entry.localId}
                onPress={() => onSelectEntry(entry.localId)}
                style={({ pressed }) => [
                  styles.historyCard,
                  isActive ? styles.historyCardActive : styles.historyCardInactive,
                  isDraft && styles.historyCardDraft,
                  !reduceMotionEnabled && pressed && styles.historyCardPressed,
                ]}
              >
                <Typography
                  allowFontScaling={false}
                  color={
                    isDraft
                      ? profileSurface.journal.historyCardDraftText
                      : profileSurface.journal.historyCardMeta
                  }
                  variant="Caption"
                  weight="bold"
                >
                  {isDraft
                    ? `Draft - ${formatEntryDateLabel(entry.updatedAt)}`
                    : formatEntryDateLabel(entry.createdAt)}
                </Typography>
                <Typography
                  allowFontScaling={false}
                  color={profileSurface.journal.historyCardPreview}
                  numberOfLines={2}
                  style={styles.historyPreview}
                  variant="Caption"
                >
                  {toPreviewText(entry.contentPreview)}
                </Typography>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Animated.View
        style={[styles.page, { transform: [{ translateX: pageTurnOffset }] }]}
        {...pagePanHandlers}
      >
        <LinearGradient
          colors={[profileSurface.journal.pageGradientFrom, profileSurface.journal.pageGradientTo]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.pageGutter}
        >
          <View style={styles.pageGutterEdge} />
        </View>
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
          accessibilityHint="Double tap to edit your current journal entry."
          accessibilityLabel={`Journal entry ${currentPageNumber} of ${totalPages}`}
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
          Swipe left or use New entry to continue. Tap any entry above to revisit.
        </Typography>
        <View style={styles.navButtons}>
          <Pressable
            accessibilityHint="Moves to the previous journal entry."
            accessibilityLabel="Previous journal entry"
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
            accessibilityHint="Moves to the next journal entry."
            accessibilityLabel="Next journal entry"
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
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[styles.savingPulse, savePulseStyle]}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entryMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyCard: {
    borderRadius: radii.md,
    borderWidth: 0.8,
    gap: spacing.xxs,
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 172,
  },
  historyCardActive: {
    backgroundColor: profileSurface.journal.historyCardActiveBackground,
    borderColor: profileSurface.journal.historyCardActiveBorder,
  },
  historyCardDraft: {
    backgroundColor: profileSurface.journal.historyCardDraftBackground,
    borderColor: profileSurface.journal.historyCardDraftBorder,
  },
  historyCardInactive: {
    backgroundColor: profileSurface.journal.historyCardBackground,
    borderColor: profileSurface.journal.historyCardBorder,
  },
  historyCardPressed: {
    opacity: interaction.card.pressedOpacity,
    transform: [{ scale: interaction.card.pressedScale }],
  },
  historyPreview: {
    lineHeight: 16,
  },
  historyRail: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  historyShell: {
    backgroundColor: profileSurface.journal.historyShellBackground,
    borderColor: profileSurface.journal.historyShellBorder,
    borderRadius: radii.md,
    borderWidth: 0.8,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  input: {
    color: profileSurface.journal.pageText,
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
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
  newEntryButton: {
    alignItems: 'center',
    backgroundColor: profileSurface.journal.newEntryBackground,
    borderColor: profileSurface.journal.newEntryBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  newEntryText: {
    textTransform: 'none',
  },
  noMotion: {
    opacity: 1,
  },
  page: {
    backgroundColor: profileSurface.journal.pageBackground,
    borderColor: profileSurface.journal.pageBorder,
    borderRadius: radii.md,
    borderWidth: 0.8,
    minHeight: 224,
    overflow: 'hidden',
    position: 'relative',
  },
  pageCurl: {
    backgroundColor: profileSurface.journal.pageCurlBackground,
    borderBottomLeftRadius: radii.md,
    borderColor: profileSurface.journal.pageCurlBorder,
    borderLeftWidth: 0.8,
    borderTopWidth: 0.8,
    height: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 24,
  },
  pageGutter: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    left: 0,
    paddingVertical: spacing.md,
    position: 'absolute',
    top: 0,
    width: 24,
    bottom: 0,
  },
  pageGutterEdge: {
    backgroundColor: profileSurface.journal.pageGutterBackground,
    borderColor: profileSurface.journal.pageGutterBorder,
    borderRadius: radii.pill,
    borderWidth: 0.8,
    height: '100%',
    marginLeft: spacing.xxs,
    width: 6,
  },
  pageLine: {
    borderBottomColor: profileSurface.journal.pageLine,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 30,
  },
  pageLinesOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  saveStatePill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  saveStateSaved: {
    backgroundColor: profileSurface.journal.saveActiveBackground,
    borderColor: profileSurface.journal.saveActiveBorder,
  },
  saveStateSaving: {
    backgroundColor: profileSurface.journal.saveActiveBackground,
    borderColor: profileSurface.journal.saveActiveBorder,
  },
  saveStateUnsaved: {
    backgroundColor: profileSurface.journal.saveUnsavedBackground,
    borderColor: profileSurface.journal.saveUnsavedBorder,
  },
  savingPulse: {
    backgroundColor: profileSurface.journal.saveActiveBackground,
    borderColor: profileSurface.journal.saveActiveBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 2,
    width: 90,
  },
  shell: {
    backgroundColor: profileSurface.journal.shellBackground,
    borderColor: profileSurface.journal.shellBorder,
    borderRadius: radii.xl,
    borderWidth: 0.8,
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
});
