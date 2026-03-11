import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Linking, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '../app/navigation/types';
import { SecondaryButton } from '../components/AppButtons';
import { Badge } from '../components/Badge';
import { PremiumProfileTrustCardSurface } from '../components/CinematicPrimitives';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { InlineErrorCard } from '../components/InlineErrorCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Typography } from '../components/Typography';
import { JournalPanel } from '../features/profile/components/JournalPanel';
import { NotificationSettingsPanel } from '../features/profile/components/NotificationSettingsPanel';
import { PrivacyPresencePanel } from '../features/profile/components/PrivacyPresencePanel';
import { SafetySupportPanel } from '../features/profile/components/SafetySupportPanel';
import { TrustHero } from '../features/profile/components/TrustHero';
import { TrustMetricsPanel } from '../features/profile/components/TrustMetricsPanel';
import {
  describeDeletionStatus,
  describeNotificationPermissionState,
  describePrivacySettings,
  describeReminderState,
  describeSafetyActionFeedback,
} from '../features/profile/services/accountTrustPresentation';
import {
  createAccountDeletionRequest,
  getAccountDeletionStatus,
  type AccountDeletionState,
} from '../lib/api/accountDeletion';
import {
  createUserJournalEntry,
  fetchProfileSummary,
  fetchUserJournalEntries,
  getCachedProfileSummary,
  getCachedUserJournalEntries,
  updateUserJournalEntry,
  type ProfileSummary,
} from '../lib/api/data';
import {
  listNotificationPreferences,
  updateNotificationPreferences,
  type NotificationCategory,
} from '../lib/api/notifications';
import {
  getPrivacySettings,
  updatePrivacySettings,
  type PrivacySettings,
  type PrivacyVisibility,
} from '../lib/api/privacy';
import { listBlockedUsers, unblockUser, type BlockRecord } from '../lib/api/safety';
import {
  getDeviceNotificationPermissionState,
  openSystemNotificationSettings,
  requestNotificationPermissionAndRegisterCurrentDevice,
} from '../lib/notifications/registerDevicePushTarget';
import {
  ACCOUNT_DELETION_WEB_URL,
  PRIVACY_WEB_URL,
  SUPPORT_WEB_URL,
  buildSupportRouteMetadata,
} from '../lib/support';
import { supabase } from '../lib/supabase';
import { MOBILE_ANALYTICS_EVENTS, trackMobileEvent } from '../lib/observability';
import { resolveCinematicArt } from '../lib/art/cinematicArt';
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

type NotificationSettingsState = {
  circleSocial: boolean;
  invite: boolean;
  occurrenceReminder: boolean;
};

type NotificationSettingKey = keyof NotificationSettingsState;

function defaultNotificationSettingsState(): NotificationSettingsState {
  return {
    circleSocial: true,
    invite: true,
    occurrenceReminder: true,
  };
}

function findGlobalPushCategoryState(
  category: NotificationCategory,
  preferences: Awaited<ReturnType<typeof listNotificationPreferences>>,
) {
  const entry = preferences.find(
    (preference) =>
      preference.category === category &&
      preference.targetType === 'global' &&
      preference.channel === 'push',
  );
  return entry ? entry.enabled : true;
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

function formatDeletionRequestTime(timestamp: string | null) {
  if (!timestamp) {
    return null;
  }

  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) {
    return null;
  }

  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

type ProfileScreenMode = 'profile' | 'settings';
type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList>;

interface ProfileScreenContentProps {
  mode: ProfileScreenMode;
}

function ProfileScreenContent({ mode }: ProfileScreenContentProps) {
  const navigation = useNavigation<ProfileNavigation>();
  const profileMode = mode === 'profile';
  const settingsMode = mode === 'settings';
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionState | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionInfoMessage, setDeletionInfoMessage] = useState<string | null>(null);
  const [loadingDeletionStatus, setLoadingDeletionStatus] = useState(false);
  const [submittingDeletionRequest, setSubmittingDeletionRequest] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsState>(
    defaultNotificationSettingsState(),
  );
  const [notificationPermissionState, setNotificationPermissionState] = useState<
    'denied' | 'granted' | 'undetermined' | 'unsupported'
  >('unsupported');
  const [loadingNotificationSettings, setLoadingNotificationSettings] = useState(false);
  const [notificationSettingsError, setNotificationSettingsError] = useState<string | null>(null);
  const [updatingNotificationCategory, setUpdatingNotificationCategory] =
    useState<NotificationCategory | null>(null);
  const [syncingNotificationPermission, setSyncingNotificationPermission] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [loadingPrivacySettings, setLoadingPrivacySettings] = useState(false);
  const [privacySettingsError, setPrivacySettingsError] = useState<string | null>(null);
  const [updatingPrivacyField, setUpdatingPrivacyField] = useState<
    'allowCircleInvites' | 'allowDirectInvites' | 'livePresenceVisibility' | 'memberListVisibility' | null
  >(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockRecord[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [safetyInfoMessage, setSafetyInfoMessage] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
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

  const loadDeletionStatus = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setDeletionStatus(null);
      setLoadingDeletionStatus(false);
      return;
    }

    setLoadingDeletionStatus(true);
    try {
      const status = await getAccountDeletionStatus();
      setDeletionStatus(status);
    } catch {
      setDeletionStatus(null);
    } finally {
      setLoadingDeletionStatus(false);
    }
  }, []);

  const loadNotificationSettings = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setNotificationSettings(defaultNotificationSettingsState());
      setNotificationPermissionState('unsupported');
      setLoadingNotificationSettings(false);
      setNotificationSettingsError(null);
      return;
    }

    setLoadingNotificationSettings(true);
    try {
      const [preferences, permissionState] = await Promise.all([
        listNotificationPreferences(),
        getDeviceNotificationPermissionState(),
      ]);

      setNotificationSettings({
        circleSocial: findGlobalPushCategoryState('circle_social', preferences),
        invite: findGlobalPushCategoryState('invite', preferences),
        occurrenceReminder: findGlobalPushCategoryState('occurrence_reminder', preferences),
      });
      setNotificationPermissionState(permissionState);
      setNotificationSettingsError(null);
    } catch (nextError) {
      setNotificationSettingsError(
        nextError instanceof Error ? nextError.message : 'Failed to load notification settings.',
      );
    } finally {
      setLoadingNotificationSettings(false);
    }
  }, []);

  const loadPrivacySettings = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setPrivacySettings(null);
      setLoadingPrivacySettings(false);
      setPrivacySettingsError(null);
      return;
    }

    setLoadingPrivacySettings(true);
    try {
      const nextPrivacySettings = await getPrivacySettings();
      setPrivacySettings(nextPrivacySettings);
      setPrivacySettingsError(null);
    } catch (nextError) {
      setPrivacySettingsError(
        nextError instanceof Error ? nextError.message : 'Failed to load privacy settings.',
      );
    } finally {
      setLoadingPrivacySettings(false);
    }
  }, []);

  const loadBlockedUsers = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setBlockedUsers([]);
      setLoadingBlockedUsers(false);
      setSafetyError(null);
      return;
    }

    setLoadingBlockedUsers(true);
    try {
      const nextBlockedUsers = await listBlockedUsers();
      setBlockedUsers(nextBlockedUsers);
      setSafetyError(null);
    } catch (nextError) {
      setSafetyError(nextError instanceof Error ? nextError.message : 'Failed to load blocked users.');
    } finally {
      setLoadingBlockedUsers(false);
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
      await loadDeletionStatus(data.user);
      await loadNotificationSettings(data.user);
      await loadPrivacySettings(data.user);
      await loadBlockedUsers(data.user);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadProfile(nextUser);
      void loadJournal(nextUser);
      void loadDeletionStatus(nextUser);
      void loadNotificationSettings(nextUser);
      void loadPrivacySettings(nextUser);
      void loadBlockedUsers(nextUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [
    loadBlockedUsers,
    loadDeletionStatus,
    loadJournal,
    loadNotificationSettings,
    loadPrivacySettings,
    loadProfile,
  ]);

  useEffect(() => {
    journalPagesRef.current = journalPages;
  }, [journalPages]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!safetyInfoMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSafetyInfoMessage(null);
    }, 3200);

    return () => {
      clearTimeout(timer);
    };
  }, [safetyInfoMessage]);

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

  const updateNotificationCategorySetting = useCallback(
    async (key: NotificationSettingKey, enabled: boolean) => {
      const categoryByKey: Record<NotificationSettingKey, NotificationCategory> = {
        circleSocial: 'circle_social',
        invite: 'invite',
        occurrenceReminder: 'occurrence_reminder',
      };
      const category = categoryByKey[key];
      setUpdatingNotificationCategory(category);

      try {
        if (enabled && notificationPermissionState === 'undetermined') {
          setSyncingNotificationPermission(true);
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_TRIGGERED, {
            source: 'profile_notification_toggle',
          });
          const permissionResult = await requestNotificationPermissionAndRegisterCurrentDevice({
            registrationSource: 'profile_notifications',
          });
          setNotificationPermissionState(permissionResult.permissionState);
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, {
            permission_state: permissionResult.permissionState,
            source: 'profile_notification_toggle',
          });
        }

        await updateNotificationPreferences({
          category,
          enabled,
          targetType: 'global',
        });

        setNotificationSettings((previous) => ({
          ...previous,
          [key]: enabled,
        }));
        setNotificationSettingsError(null);
        if (category === 'occurrence_reminder') {
          trackMobileEvent(MOBILE_ANALYTICS_EVENTS.LIVE_REMINDER_TOGGLED, {
            category,
            enabled,
            source: 'profile_notifications',
          });
        }
      } catch (nextError) {
        setNotificationSettingsError(
          nextError instanceof Error ? nextError.message : 'Failed to update notification settings.',
        );
      } finally {
        setSyncingNotificationPermission(false);
        setUpdatingNotificationCategory(null);
      }
    },
    [notificationPermissionState],
  );

  const handleNotificationPermissionAction = useCallback(async () => {
    const presentation = describeNotificationPermissionState(notificationPermissionState);
    if (presentation.action === 'request_permission') {
      setSyncingNotificationPermission(true);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_TRIGGERED, {
        source: 'profile_notification_permission_card',
      });
      try {
        const permissionResult = await requestNotificationPermissionAndRegisterCurrentDevice({
          registrationSource: 'profile_notifications',
        });
        setNotificationPermissionState(permissionResult.permissionState);
        setNotificationSettingsError(null);
        trackMobileEvent(MOBILE_ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, {
          permission_state: permissionResult.permissionState,
          source: 'profile_notification_permission_card',
        });
      } catch (nextError) {
        setNotificationSettingsError(
          nextError instanceof Error ? nextError.message : 'Could not enable notifications.',
        );
      } finally {
        setSyncingNotificationPermission(false);
      }
      return;
    }

    if (presentation.action === 'open_settings') {
      try {
        await openSystemNotificationSettings();
      } catch {
        setNotificationSettingsError('Could not open system notification settings.');
      }
    }
  }, [notificationPermissionState]);

  const updatePrivacyField = useCallback(
    async (
      field:
        | 'allowCircleInvites'
        | 'allowDirectInvites'
        | 'livePresenceVisibility'
        | 'memberListVisibility',
      input: {
        allowCircleInvites?: boolean;
        allowDirectInvites?: boolean;
        livePresenceVisibility?: PrivacyVisibility;
        memberListVisibility?: PrivacyVisibility;
      },
    ) => {
      setUpdatingPrivacyField(field);
      try {
        const nextPrivacySettings = await updatePrivacySettings(input);
        setPrivacySettings(nextPrivacySettings);
        setPrivacySettingsError(null);
      } catch (nextError) {
        setPrivacySettingsError(
          nextError instanceof Error ? nextError.message : 'Could not update privacy settings.',
        );
      } finally {
        setUpdatingPrivacyField(null);
      }
    },
    [],
  );

  const unblockUserFromSafetyPanel = useCallback(async (userToUnblock: BlockRecord) => {
    setUnblockingUserId(userToUnblock.blockedUserId);
    try {
      await unblockUser(userToUnblock.blockedUserId);
      setBlockedUsers((previous) =>
        previous.filter((entry) => entry.blockedUserId !== userToUnblock.blockedUserId),
      );
      setSafetyInfoMessage(
        describeSafetyActionFeedback({
          action: 'unblock',
          targetLabel: userToUnblock.blockedDisplayName,
        }),
      );
      setSafetyError(null);
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.TRUST_ACTION_UNBLOCK, {
        source: 'profile_safety_panel',
        target_type: 'user',
      });
    } catch (nextError) {
      setSafetyError(nextError instanceof Error ? nextError.message : 'Failed to unblock user.');
    } finally {
      setUnblockingUserId(null);
    }
  }, []);

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

  const openExternalUrl = useCallback(async (url: string, failureMessage: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', failureMessage);
    }
  }, []);

  const onRetryProfileLoad = () => {
    setError(null);
    setDeletionError(null);
    setDeletionInfoMessage(null);
    setJournalError(null);
    setNotificationSettingsError(null);
    setPrivacySettingsError(null);
    setSafetyError(null);
    void loadProfile(user);
    void loadJournal(user);
    void loadDeletionStatus(user);
    void loadNotificationSettings(user);
    void loadPrivacySettings(user);
    void loadBlockedUsers(user);
  };

  const activeDeletionRequest = Boolean(
    deletionStatus &&
      (deletionStatus.status === 'requested' ||
        deletionStatus.status === 'acknowledged' ||
        deletionStatus.status === 'in_review'),
  );

  const submitDeletionRequest = useCallback(async () => {
    if (activeDeletionRequest) {
      setDeletionInfoMessage('A deletion request is already active. You can track status here.');
      return;
    }

    const supportRouting = buildSupportRouteMetadata({
      source: 'account_deletion',
      surface: 'profile',
    });
    const previousRequestId = deletionStatus?.requestId ?? null;

    setSubmittingDeletionRequest(true);
    try {
      const requestResult = await createAccountDeletionRequest({
        details: 'Initiated from in-app profile flow.',
        reason: 'user_initiated_in_app',
        supportMetadata: supportRouting.supportMetadata,
        supportRoute: supportRouting.supportRoute,
      });
      const status = await getAccountDeletionStatus();
      setDeletionStatus(status);
      setDeletionError(null);
      if (previousRequestId && previousRequestId === requestResult.requestId) {
        setDeletionInfoMessage('A deletion request is already active and being reviewed.');
      } else if (
        requestResult.status === 'acknowledged' ||
        requestResult.status === 'in_review'
      ) {
        setDeletionInfoMessage('A deletion request is already active and in progress.');
      } else {
        setDeletionInfoMessage(
          'Deletion request submitted. Support will review it and you can track status here.',
        );
      }
      trackMobileEvent(MOBILE_ANALYTICS_EVENTS.ACCOUNT_DELETION_REQUESTED, {
        source: 'profile_account_deletion',
        status: status?.status ?? null,
      });
    } catch (nextError) {
      setDeletionInfoMessage(null);
      setDeletionError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to request account deletion at this time.',
      );
    } finally {
      setSubmittingDeletionRequest(false);
    }
  }, [activeDeletionRequest, deletionStatus?.requestId]);

  const requestAccountDeletion = useCallback(() => {
    if (activeDeletionRequest) {
      setDeletionInfoMessage('A deletion request is already active. You can track status here.');
      return;
    }

    Alert.alert(
      'Request full account deletion',
      'This requests full account deletion, not deactivation. Support reviews requests before completion. Some records may be retained for legal, billing, fraud, or security obligations. Continue?',
      [
        {
          style: 'cancel',
          text: 'Cancel',
        },
        {
          style: 'destructive',
          text: 'Request deletion',
          onPress: () => {
            void submitDeletionRequest();
          },
        },
      ],
    );
  }, [activeDeletionRequest, submitDeletionRequest]);

  const deletionStatusPresentation = describeDeletionStatus(deletionStatus?.status ?? null);
  const notificationPermissionPresentation = describeNotificationPermissionState(
    notificationPermissionState,
  );
  const reminderPreferencePresentation = describeReminderState({
    permissionState: notificationPermissionState,
    reminderEnabled: notificationSettings.occurrenceReminder,
  });
  const privacySummary = privacySettings
    ? describePrivacySettings({
        allowCircleInvites: privacySettings.allowCircleInvites,
        allowDirectInvites: privacySettings.allowDirectInvites,
        livePresenceVisibility: privacySettings.livePresenceVisibility,
        memberListVisibility: privacySettings.memberListVisibility,
      })
    : null;

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
  const deletionRequestedAtLabel = formatDeletionRequestTime(deletionStatus?.requestedAt ?? null);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="profile"
    >
      <View style={styles.topBar}>
        <View style={styles.topBarTitleWrap}>
          <Typography variant="H2" weight="bold">
            {profileMode ? 'Profile' : 'Settings'}
          </Typography>
          <Typography color={profileSurface.utility.subtitle} variant="Caption">
            {profileMode
              ? 'Trust, reflection, and account overview.'
              : 'Notifications, privacy, safety, and account controls.'}
          </Typography>
        </View>
        <Pressable
          accessibilityHint={
            profileMode
              ? 'Opens notifications, privacy, safety, and account settings.'
              : 'Returns to your profile.'
          }
          accessibilityLabel={profileMode ? 'Open settings' : 'Back to profile'}
          accessibilityRole="button"
          onPress={() => {
            if (profileMode) {
              navigation.navigate('ProfileSettings');
              return;
            }
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate('ProfileHome');
          }}
          style={({ pressed }) => [styles.topActionButton, pressed ? styles.topActionButtonPressed : null]}
        >
          <MaterialCommunityIcons
            color={profileSurface.utility.title}
            name={profileMode ? 'cog-outline' : 'arrow-left'}
            size={22}
          />
        </Pressable>
      </View>

      {profileMode ? (
        <>
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

          {!loadingProfile && !summary ? (
            <EmptyStateCard
              backgroundColor={profileSurface.utility.panelBackground}
              body="Your trust snapshot is still syncing. You can continue journaling while metrics refresh."
              bodyColor={profileSurface.utility.subtitle}
              borderColor={profileSurface.utility.panelBorder}
              iconBackgroundColor={profileSurface.utility.panelBackground}
              iconBorderColor={profileSurface.utility.panelBorder}
              iconName="shield-refresh-outline"
              iconTint={profileSurface.utility.title}
              title="Profile snapshot pending"
              titleColor={profileSurface.utility.title}
            />
          ) : null}

          <PremiumProfileTrustCardSurface
            accessibilityHint="Opens notifications, privacy, safety, and account deletion controls."
            accessibilityLabel="Settings overview"
            artSource={resolveCinematicArt('profile.hero.ledger')}
            fallbackIcon="shield-crown-outline"
            fallbackLabel="Settings sanctuary"
            section="profile"
            style={styles.utilityPanel}
          >
            <SectionHeader
              compact
              subtitle="Move to Settings for notifications, privacy, safety, support, and full account deletion."
              subtitleColor={profileSurface.utility.subtitle}
              title="Settings and safeguards"
              titleColor={profileSurface.utility.title}
              trailing={
                <Badge
                  label={deletionStatusPresentation.badgeLabel}
                  tone={
                    deletionStatusPresentation.badgeTone === 'success'
                      ? 'success'
                      : deletionStatusPresentation.badgeTone === 'warning'
                        ? 'warning'
                        : deletionStatusPresentation.badgeTone === 'danger'
                          ? 'error'
                          : 'active'
                  }
                />
              }
            />
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {notificationPermissionPresentation.detail}
            </Typography>
            {privacySummary ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                {privacySummary.inviteRequests}
              </Typography>
            ) : null}
            <SecondaryButton
              onPress={() => {
                navigation.navigate('ProfileSettings');
              }}
              title="Open settings sanctuary"
            />
            <SecondaryButton
              onPress={() => {
                navigation.navigate('ProfileSettings');
              }}
              title="Open account deletion in settings"
            />
          </PremiumProfileTrustCardSurface>
        </>
      ) : null}

      {settingsMode ? (
        <>
          <PremiumProfileTrustCardSurface
            accessibilityHint="Introduces your settings surfaces."
            accessibilityLabel="Settings sanctuary"
            artSource={resolveCinematicArt('profile.hero.settings')}
            fallbackIcon="cog-outline"
            fallbackLabel="Settings sanctuary"
            section="profile"
            style={styles.utilityPanel}
          >
            <SectionHeader
              compact
              subtitle="All settings controls are grouped here to keep Profile focused and concise."
              subtitleColor={profileSurface.utility.subtitle}
              title="Settings sanctuary"
              titleColor={profileSurface.utility.title}
            />
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {notificationPermissionPresentation.title}
            </Typography>
          </PremiumProfileTrustCardSurface>

          <NotificationSettingsPanel
            errorMessage={notificationSettingsError}
            loading={loadingNotificationSettings}
            onOpenSettings={() => {
              void handleNotificationPermissionAction();
            }}
            onRequestPermission={() => {
              void handleNotificationPermissionAction();
            }}
            onToggleCategory={(category, enabled) => {
              const settingKeyByCategory: Partial<
                Record<NotificationCategory, NotificationSettingKey>
              > = {
                circle_social: 'circleSocial',
                invite: 'invite',
                occurrence_reminder: 'occurrenceReminder',
              };
              const key = settingKeyByCategory[category];
              if (!key) {
                return;
              }
              void updateNotificationCategorySetting(key, enabled);
            }}
            permission={notificationPermissionPresentation}
            reminderState={reminderPreferencePresentation}
            rows={[
              {
                category: 'occurrence_reminder',
                description: 'Default reminder preference for upcoming live moments.',
                enabled: notificationSettings.occurrenceReminder,
                title: 'Live reminders',
              },
              {
                category: 'invite',
                description: 'Alerts for new circle invite requests.',
                enabled: notificationSettings.invite,
                title: 'Circle invites',
              },
              {
                category: 'circle_social',
                description: 'Circle activity and social updates.',
                enabled: notificationSettings.circleSocial,
                title: 'Circle activity',
              },
            ]}
            syncingPermission={syncingNotificationPermission}
            updatingCategory={updatingNotificationCategory}
          />

          <PrivacyPresencePanel
            errorMessage={privacySettingsError}
            loading={loadingPrivacySettings}
            onToggleAllowCircleInvites={(value) => {
              void updatePrivacyField('allowCircleInvites', {
                allowCircleInvites: value,
              });
            }}
            onToggleAllowDirectInvites={(value) => {
              void updatePrivacyField('allowDirectInvites', {
                allowDirectInvites: value,
              });
            }}
            onUpdateLivePresenceVisibility={(value) => {
              void updatePrivacyField('livePresenceVisibility', {
                livePresenceVisibility: value,
              });
            }}
            onUpdateMemberListVisibility={(value) => {
              void updatePrivacyField('memberListVisibility', {
                memberListVisibility: value,
              });
            }}
            privacySettings={privacySettings}
            summary={privacySummary}
            updatingField={updatingPrivacyField}
          />

          <SafetySupportPanel
            blockedUsers={blockedUsers}
            errorMessage={safetyError}
            infoMessage={safetyInfoMessage}
            loading={loadingBlockedUsers}
            onOpenPrivacy={() => {
              void openExternalUrl(PRIVACY_WEB_URL, 'Could not open privacy policy.');
            }}
            onOpenSupport={() => {
              void openExternalUrl(SUPPORT_WEB_URL, 'Could not open support page.');
            }}
            onUnblock={(userToUnblock) => {
              void unblockUserFromSafetyPanel(userToUnblock);
            }}
            unblockingUserId={unblockingUserId}
          />

          <PremiumProfileTrustCardSurface
            accessibilityHint="Contains account-level actions."
            accessibilityLabel="Account actions"
            artSource={resolveCinematicArt('profile.hero.ledger')}
            fallbackIcon="shield-account-outline"
            fallbackLabel="Secure controls"
            section="profile"
            style={styles.utilityPanel}
          >
            <SectionHeader
              compact
              subtitle="Sign out at any time while your journal and progress remain synced."
              subtitleColor={profileSurface.utility.subtitle}
              title="Account sanctuary"
              titleColor={profileSurface.utility.title}
              trailing={<Badge label="Secure account" tone="success" />}
            />
            <SecondaryButton loading={loadingSignOut} onPress={onSignOut} title="Sign out" />
          </PremiumProfileTrustCardSurface>

          <PremiumProfileTrustCardSurface
            accessibilityHint="Contains account deletion and support actions."
            accessibilityLabel="Deletion and support"
            artSource={resolveCinematicArt('profile.hero.settings')}
            fallbackIcon="alert-decagram-outline"
            fallbackLabel="Safety controls"
            section="profile"
            style={styles.utilityPanel}
          >
            <SectionHeader
              compact
              subtitle={
                loadingDeletionStatus
                  ? 'Checking deletion workflow status...'
                  : deletionStatusPresentation.headline
              }
              subtitleColor={profileSurface.utility.subtitle}
              title="Account deletion"
              titleColor={profileSurface.utility.title}
              trailing={
                <Badge
                  label={deletionStatusPresentation.badgeLabel}
                  tone={
                    deletionStatusPresentation.badgeTone === 'success'
                      ? 'success'
                      : deletionStatusPresentation.badgeTone === 'warning'
                        ? 'warning'
                        : deletionStatusPresentation.badgeTone === 'danger'
                          ? 'error'
                          : 'active'
                  }
                />
              }
            />
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              {deletionStatusPresentation.detail}
            </Typography>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              Requesting deletion removes your account and associated personal data where permitted. It
              is a full deletion workflow, not account deactivation.
            </Typography>
            <Typography color={profileSurface.utility.subtitle} variant="Caption">
              We may retain limited records only for legal, fraud, security, billing, or audit
              obligations. We target completion within 7 business days after verification.
            </Typography>
            {deletionRequestedAtLabel ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                Request created: {deletionRequestedAtLabel}
              </Typography>
            ) : null}
            {deletionInfoMessage ? (
              <Typography color={profileSurface.utility.subtitle} variant="Caption">
                {deletionInfoMessage}
              </Typography>
            ) : null}
            <SecondaryButton
              disabled={deletionStatusPresentation.requestDisabled}
              loading={submittingDeletionRequest}
              onPress={requestAccountDeletion}
              title={
                deletionStatusPresentation.requestDisabled
                  ? 'Deletion request in progress'
                  : 'Request full account deletion'
              }
            />
            <SecondaryButton
              onPress={() => {
                void openExternalUrl(
                  ACCOUNT_DELETION_WEB_URL,
                  'Could not open account deletion page.',
                );
              }}
              title="Open account deletion page"
            />
            <SecondaryButton
              onPress={() => {
                void openExternalUrl(SUPPORT_WEB_URL, 'Could not open support page.');
              }}
              title="Open support"
            />
            {deletionError ? (
              <InlineErrorCard
                message={deletionError}
                title="Deletion request issue"
                tone="warning"
              />
            ) : null}
          </PremiumProfileTrustCardSurface>
        </>
      ) : null}

      {error ? (
        <RetryPanel
          message={error}
          onRetry={onRetryProfileLoad}
          retryLabel="Retry"
          style={styles.feedbackCard}
          title="Could not load profile"
        />
      ) : null}

      {profileMode && journalError ? (
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

export function ProfileScreen() {
  return <ProfileScreenContent mode="profile" />;
}

export function ProfileSettingsScreen() {
  return <ProfileScreenContent mode="settings" />;
}

const styles = StyleSheet.create({
  content: {
    gap: PROFILE_SECTION_GAP + spacing.xxs,
    paddingBottom: spacing.sm,
  },
  feedbackCard: {
    minHeight: 44,
  },
  topActionButton: {
    alignItems: 'center',
    backgroundColor: profileSurface.utility.panelBackground,
    borderColor: profileSurface.utility.panelBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  topActionButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.97 }],
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBarTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.sm,
  },
  utilityPanel: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
});
