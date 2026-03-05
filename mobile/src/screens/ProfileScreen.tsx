import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';

import { Button } from '../components/Button';
import { MetricRow } from '../components/MetricRow';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  createUserJournalEntry,
  fetchProfileSummary,
  fetchUserJournalEntries,
  getCachedProfileSummary,
  getCachedUserJournalEntries,
  updateUserJournalEntry,
  type ProfileSummary,
} from '../lib/api/data';
import { supabase } from '../lib/supabase';
import {
  PROFILE_IMPACT_HEIGHT,
  PROFILE_ROW_GAP,
  PROFILE_SECTION_GAP,
} from '../theme/figmaV2Layout';
import { colors, radii, spacing } from '../theme/tokens';

function formatImpact(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }
  return `${value}%`;
}

interface JournalPageState {
  content: string;
  createdAt: string | null;
  entryId: string | null;
  lastSavedContent: string;
  localId: string;
  updatedAt: string | null;
}

function createDraftJournalPage(): JournalPageState {
  return {
    content: '',
    createdAt: null,
    entryId: null,
    lastSavedContent: '',
    localId: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: null,
  };
}

export function ProfileScreen() {
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [journalPages, setJournalPages] = useState<JournalPageState[]>([createDraftJournalPage()]);
  const [currentJournalPageIndex, setCurrentJournalPageIndex] = useState(0);
  const [journalSavingLocalId, setJournalSavingLocalId] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);
  const pageTurnOffset = useRef(new Animated.Value(0)).current;
  const journalPagesRef = useRef<JournalPageState[]>(journalPages);
  const userIdRef = useRef<string | null>(null);

  const applyJournalEntries = useCallback(
    (
      entries: {
        content: string;
        createdAt: string;
        id: string;
        updatedAt: string;
      }[],
    ) => {
      const pages = entries.map((entry) => ({
        content: entry.content,
        createdAt: entry.createdAt,
        entryId: entry.id,
        lastSavedContent: entry.content,
        localId: entry.id,
        updatedAt: entry.updatedAt,
      }));

      if (pages.length === 0) {
        setJournalPages([createDraftJournalPage()]);
        setCurrentJournalPageIndex(0);
        return;
      }

      setJournalPages(pages);
      setCurrentJournalPageIndex(pages.length - 1);
    },
    [],
  );

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setSummary(null);
      setLoadingProfile(false);
      return;
    }

    const cachedSummary = getCachedProfileSummary(nextUser.id);
    if (cachedSummary) {
      setSummary(cachedSummary);
      setLoadingProfile(false);
    } else {
      setLoadingProfile(true);
    }

    try {
      const nextSummary = await fetchProfileSummary(nextUser.id);
      setSummary(nextSummary);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadJournal = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser) {
        setJournalPages([createDraftJournalPage()]);
        setCurrentJournalPageIndex(0);
        setJournalError(null);
        return;
      }

      const cachedEntries = getCachedUserJournalEntries(nextUser.id);
      if (cachedEntries) {
        applyJournalEntries(cachedEntries);
      }

      try {
        const entries = await fetchUserJournalEntries(nextUser.id);
        applyJournalEntries(entries);
        setJournalError(null);
      } catch (nextError) {
        setJournalError(nextError instanceof Error ? nextError.message : 'Failed to load journal.');
        setJournalPages([createDraftJournalPage()]);
        setCurrentJournalPageIndex(0);
      }
    },
    [applyJournalEntries],
  );

  const persistPageByLocalId = useCallback(async (localId: string) => {
    const userId = userIdRef.current;
    if (!userId) {
      return;
    }

    const page = journalPagesRef.current.find((item) => item.localId === localId);
    if (!page) {
      return;
    }

    if (page.content === page.lastSavedContent) {
      return;
    }

    if (!page.entryId && page.content.trim().length === 0) {
      return;
    }

    setJournalSavingLocalId(localId);

    try {
      if (page.entryId) {
        const updated = await updateUserJournalEntry({
          content: page.content,
          entryId: page.entryId,
          userId,
        });

        setJournalPages((previous) =>
          previous.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  content: updated.content,
                  lastSavedContent: updated.content,
                  updatedAt: updated.updatedAt,
                }
              : item,
          ),
        );
      } else {
        const created = await createUserJournalEntry({
          content: page.content,
          userId,
        });

        setJournalPages((previous) =>
          previous.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  content: created.content,
                  createdAt: created.createdAt,
                  entryId: created.id,
                  lastSavedContent: created.content,
                  localId: created.id,
                  updatedAt: created.updatedAt,
                }
              : item,
          ),
        );
      }

      setJournalError(null);
    } catch (nextError) {
      setJournalError(
        nextError instanceof Error ? nextError.message : 'Failed to save journal page.',
      );
    } finally {
      setJournalSavingLocalId((current) => (current === localId ? null : current));
    }
  }, []);

  const animatePageTurn = useCallback(
    (direction: 'left' | 'right') => {
      pageTurnOffset.setValue(direction === 'left' ? 22 : -22);
      Animated.spring(pageTurnOffset, {
        bounciness: 0,
        speed: 16,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [pageTurnOffset],
  );

  const goToNextJournalPage = useCallback(() => {
    const currentPage = journalPagesRef.current[currentJournalPageIndex];
    if (currentPage) {
      void persistPageByLocalId(currentPage.localId);
    }

    const hasExistingNext = currentJournalPageIndex < journalPagesRef.current.length - 1;
    if (!hasExistingNext) {
      setJournalPages((previous) => [...previous, createDraftJournalPage()]);
    }

    setCurrentJournalPageIndex((previous) => previous + 1);
    animatePageTurn('left');
  }, [animatePageTurn, currentJournalPageIndex, persistPageByLocalId]);

  const goToPreviousJournalPage = useCallback(() => {
    if (currentJournalPageIndex <= 0) {
      return;
    }

    const currentPage = journalPagesRef.current[currentJournalPageIndex];
    if (currentPage) {
      void persistPageByLocalId(currentPage.localId);
    }

    setCurrentJournalPageIndex((previous) => Math.max(0, previous - 1));
    animatePageTurn('right');
  }, [animatePageTurn, currentJournalPageIndex, persistPageByLocalId]);

  const pagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 18,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx <= -48) {
            goToNextJournalPage();
            return;
          }

          if (gestureState.dx >= 48) {
            goToPreviousJournalPage();
          }
        },
      }),
    [goToNextJournalPage, goToPreviousJournalPage],
  );

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) {
        return;
      }

      if (userError) {
        setError(userError.message);
        return;
      }

      setUser(data.user);
      await loadProfile(data.user);
      await loadJournal(data.user);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadProfile(nextUser);
      void loadJournal(nextUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadJournal, loadProfile]);

  useEffect(() => {
    journalPagesRef.current = journalPages;
  }, [journalPages]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const activeJournalPage = journalPages[currentJournalPageIndex] ?? journalPages[0] ?? null;

  useEffect(() => {
    if (!activeJournalPage) {
      return;
    }

    const saveTimeout = setTimeout(() => {
      void persistPageByLocalId(activeJournalPage.localId);
    }, 700);

    return () => {
      clearTimeout(saveTimeout);
    };
  }, [activeJournalPage, persistPageByLocalId]);

  const onSignOut = async () => {
    setError(null);
    setLoadingSignOut(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
      }
    } finally {
      setLoadingSignOut(false);
    }
  };

  const statRows = useMemo(
    () => [
      { label: 'Circle members', value: (summary?.circleMembers ?? 0).toString() },
      {
        label: 'Event rooms joined this week',
        value: (summary?.eventsJoinedThisWeek ?? 0).toString(),
      },
    ],
    [summary],
  );

  const soloStreakValue = `${summary?.soloStreakDays ?? 0} days`;

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="profile"
    >
      <Typography allowFontScaling={false} variant="H1" weight="bold">
        Trust and progress
      </Typography>
      <Typography allowFontScaling={false} color={colors.textSecondary}>
        Track your activity, accessibility settings, and account status.
      </Typography>

      <SurfaceCard radius="xl" style={[styles.section, styles.impactCard]} variant="profileImpact">
        {loadingProfile ? (
          <ActivityIndicator color={colors.accentMintStart} />
        ) : (
          <>
            <Typography allowFontScaling={false} variant="Metric" weight="bold">
              {formatImpact(summary?.weeklyImpactChangePercent ?? 0)}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textLabel} variant="Label">
              Weekly collective impact change
            </Typography>
            <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption">
              {`Minutes prayed: ${summary?.minutesPrayed ?? 0} - Sessions this week: ${summary?.sessionsThisWeek ?? 0}`}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption">
              {`Account: ${user?.email ?? 'Unavailable'}`}
            </Typography>
          </>
        )}
      </SurfaceCard>

      <View style={styles.statsList}>
        {statRows.map((item) => (
          <MetricRow key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      <MetricRow label="Solo completion streak" value={soloStreakValue} />

      <SurfaceCard radius="xl" style={styles.journalCard} variant="homeStat">
        <View style={styles.journalHeader}>
          <View style={styles.journalTitleWrap}>
            <MaterialCommunityIcons color={colors.textPrimary} name="notebook-outline" size={18} />
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              Journal
            </Typography>
          </View>
          <Typography
            allowFontScaling={false}
            color={colors.textSecondary}
            variant="Caption"
            weight="bold"
          >
            {`Page ${Math.min(currentJournalPageIndex + 1, journalPages.length)} of ${journalPages.length}`}
          </Typography>
        </View>

        <Animated.View
          style={[styles.journalPage, { transform: [{ translateX: pageTurnOffset }] }]}
          {...pagePanResponder.panHandlers}
        >
          <View pointerEvents="none" style={styles.journalLinesOverlay}>
            {Array.from({ length: 7 }).map((_, lineIndex) => (
              <View key={`journal-line-${lineIndex}`} style={styles.journalLine} />
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={(nextText) => {
              const activeLocalId = activeJournalPage?.localId;
              if (!activeLocalId) {
                return;
              }

              setJournalPages((previous) =>
                previous.map((page) =>
                  page.localId === activeLocalId
                    ? {
                        ...page,
                        content: nextText,
                      }
                    : page,
                ),
              );
            }}
            placeholder="Write your intentions, manifestations, or reflections..."
            placeholderTextColor={colors.textCaption}
            style={styles.journalInput}
            textAlignVertical="top"
            value={activeJournalPage?.content ?? ''}
          />
          <View pointerEvents="none" style={styles.pageCurl} />
        </Animated.View>

        <View style={styles.journalFooter}>
          <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
            Swipe left for a new page, swipe right for previous reflections.
          </Typography>
          <View style={styles.journalNavButtons}>
            <Pressable
              disabled={currentJournalPageIndex === 0}
              onPress={goToPreviousJournalPage}
              style={({ pressed }) => [
                styles.navButton,
                currentJournalPageIndex === 0 && styles.navButtonDisabled,
                pressed && styles.navButtonPressed,
              ]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="chevron-left" size={18} />
            </Pressable>
            <Pressable
              onPress={goToNextJournalPage}
              style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="chevron-right" size={18} />
            </Pressable>
          </View>
        </View>

        {journalSavingLocalId === activeJournalPage?.localId ? (
          <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
            Saving page...
          </Typography>
        ) : null}
      </SurfaceCard>

      {error ? (
        <Typography allowFontScaling={false} color={colors.danger}>
          {error}
        </Typography>
      ) : null}

      {journalError ? (
        <Typography allowFontScaling={false} color={colors.danger} variant="Caption">
          {journalError}
        </Typography>
      ) : null}

      <Button loading={loadingSignOut} onPress={onSignOut} title="Sign out" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP,
  },
  impactCard: {
    minHeight: PROFILE_IMPACT_HEIGHT,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
  },
  statsList: {
    gap: PROFILE_ROW_GAP,
  },
  journalCard: {
    gap: PROFILE_ROW_GAP,
  },
  journalFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  journalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  journalInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  journalLine: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 28,
  },
  journalLinesOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  journalNavButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  journalPage: {
    backgroundColor: colors.surface,
    borderColor: colors.borderMedium,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 208,
    overflow: 'hidden',
    position: 'relative',
  },
  journalTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  pageCurl: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderMedium,
    borderBottomLeftRadius: radii.md,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    height: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 24,
  },
});
