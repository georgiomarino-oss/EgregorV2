import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';
import type { User } from '@supabase/supabase-js';

import { ActionPanel } from '../components/ActionPanel';
import { Button } from '../components/Button';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { JournalPanel } from '../features/profile/components/JournalPanel';
import { TrustHero } from '../features/profile/components/TrustHero';
import { TrustMetricsPanel } from '../features/profile/components/TrustMetricsPanel';
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
import { PROFILE_SECTION_GAP } from '../theme/figmaV2Layout';
import { profileSurface, spacing } from '../theme/tokens';

interface JournalPageState {
  content: string;
  createdAt: string | null;
  entryId: string | null;
  lastSavedContent: string;
  localId: string;
  updatedAt: string | null;
}

interface JournalEntryPreview {
  contentPreview: string;
  createdAt: string | null;
  isPersisted: boolean;
  localId: string;
  pageNumber: number;
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

function formatRelativeSaveTime(timestamp: string | null) {
  if (!timestamp) {
    return 'Not saved yet';
  }

  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) {
    return 'Saved';
  }

  const deltaMs = Date.now() - value;
  if (deltaMs < 60_000) {
    return 'Saved just now';
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `Saved ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Saved ${hours}h ago`;
  }

  return `Saved ${new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
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
      const canCreateNewPage = Boolean(currentPage?.entryId || currentPage?.content.trim().length);
      if (!canCreateNewPage) {
        return;
      }

      setJournalPages((previous) => [...previous, createDraftJournalPage()]);
    }

    setCurrentJournalPageIndex((previous) => previous + 1);
    animatePageTurn('left');
  }, [animatePageTurn, currentJournalPageIndex, persistPageByLocalId]);

  const selectJournalEntry = useCallback(
    (localId: string) => {
      const pages = journalPagesRef.current;
      const nextIndex = pages.findIndex((page) => page.localId === localId);
      if (nextIndex < 0 || nextIndex === currentJournalPageIndex) {
        return;
      }

      const currentPage = pages[currentJournalPageIndex];
      if (currentPage) {
        void persistPageByLocalId(currentPage.localId);
      }

      setCurrentJournalPageIndex(nextIndex);
      animatePageTurn(nextIndex > currentJournalPageIndex ? 'left' : 'right');
    },
    [animatePageTurn, currentJournalPageIndex, persistPageByLocalId],
  );

  const createAndFocusNewJournalEntry = useCallback(() => {
    const pages = journalPagesRef.current;
    const currentPage = pages[currentJournalPageIndex];
    if (currentPage) {
      void persistPageByLocalId(currentPage.localId);
    }

    const lastPage = pages[pages.length - 1];
    const hasTrailingBlankDraft = Boolean(
      lastPage && !lastPage.entryId && !lastPage.content.trim().length,
    );

    if (hasTrailingBlankDraft) {
      const trailingIndex = pages.length - 1;
      if (trailingIndex !== currentJournalPageIndex) {
        setCurrentJournalPageIndex(trailingIndex);
        animatePageTurn('left');
      }
      return;
    }

    setJournalPages((previous) => [...previous, createDraftJournalPage()]);
    setCurrentJournalPageIndex(pages.length);
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
  const journalEntryPreviews = useMemo<JournalEntryPreview[]>(
    () =>
      journalPages.map((page, index) => ({
        contentPreview: page.content.trim(),
        createdAt: page.createdAt,
        isPersisted: Boolean(page.entryId),
        localId: page.localId,
        pageNumber: index + 1,
        updatedAt: page.updatedAt,
      })),
    [journalPages],
  );

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

  const onRetryProfileLoad = () => {
    setError(null);
    setJournalError(null);
    void loadProfile(user);
    void loadJournal(user);
  };

  const currentPageNumber = Math.min(currentJournalPageIndex + 1, journalPages.length);
  const isSavingActivePage = journalSavingLocalId === activeJournalPage?.localId;
  const hasUnsavedChanges = Boolean(
    activeJournalPage && activeJournalPage.content !== activeJournalPage.lastSavedContent,
  );
  const saveStateLabel = isSavingActivePage
    ? 'Saving...'
    : hasUnsavedChanges
      ? 'Unsaved changes'
      : formatRelativeSaveTime(
          activeJournalPage?.updatedAt ?? activeJournalPage?.createdAt ?? null,
        );
  const saveStateTone = isSavingActivePage ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved';

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="profile"
    >
      <TrustHero
        accountEmail={user?.email ?? null}
        loading={loadingProfile}
        sessionsThisWeek={summary?.sessionsThisWeek ?? 0}
        soloStreakDays={summary?.soloStreakDays ?? 0}
        weeklyImpactChangePercent={summary?.weeklyImpactChangePercent ?? 0}
      />

      <TrustMetricsPanel
        circleMembers={summary?.circleMembers ?? 0}
        eventsJoinedThisWeek={summary?.eventsJoinedThisWeek ?? 0}
        loading={loadingProfile}
        minutesPrayed={summary?.minutesPrayed ?? 0}
        sessionsThisWeek={summary?.sessionsThisWeek ?? 0}
        soloStreakDays={summary?.soloStreakDays ?? 0}
      />

      <JournalPanel
        activeEntryLocalId={activeJournalPage?.localId ?? null}
        canCreateNewEntry
        canGoPreviousPage={currentJournalPageIndex > 0}
        currentPageNumber={currentPageNumber}
        entries={journalEntryPreviews}
        isSavingCurrentPage={isSavingActivePage}
        onCreateEntry={createAndFocusNewJournalEntry}
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
        onNextPage={goToNextJournalPage}
        onPreviousPage={goToPreviousJournalPage}
        onSelectEntry={selectJournalEntry}
        pageContent={activeJournalPage?.content ?? ''}
        pagePanHandlers={pagePanResponder.panHandlers}
        pageTurnOffset={pageTurnOffset}
        saveStateLabel={saveStateLabel}
        saveStateTone={saveStateTone}
        totalPages={journalPages.length}
      />

      <ActionPanel
        accessibilityHint="Contains account-level actions."
        accessibilityLabel="Account actions"
        accessibilityRole="summary"
        backgroundColor={profileSurface.utility.panelBackground}
        borderColor={profileSurface.utility.panelBorder}
        style={styles.utilityPanel}
      >
        <Typography
          allowFontScaling={false}
          color={profileSurface.utility.title}
          variant="Body"
          weight="bold"
        >
          Account actions
        </Typography>
        <Typography
          allowFontScaling={false}
          color={profileSurface.utility.subtitle}
          variant="Caption"
        >
          Sign out at any time while your journal and progress remain synced.
        </Typography>
        <Button loading={loadingSignOut} onPress={onSignOut} title="Sign out" variant="secondary" />
      </ActionPanel>

      {error ? (
        <RetryPanel
          message={error}
          onRetry={onRetryProfileLoad}
          retryLabel="Retry"
          style={styles.feedbackCard}
          title="Could not load profile"
        />
      ) : null}

      {journalError ? (
        <InlineErrorCard
          message={journalError}
          style={styles.feedbackCard}
          title="Journal sync issue"
          tone="warning"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP + spacing.xxs,
    paddingBottom: spacing.sm,
  },
  feedbackCard: {
    minHeight: 44,
  },
  utilityPanel: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
});
