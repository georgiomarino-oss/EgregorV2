import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  StyleSheet,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Badge } from '../components/Badge';
import { PrimaryButton, SecondaryButton } from '../components/AppButtons';
import { LoadingStateCard } from '../components/LoadingStateCard';
import { RetryPanel } from '../components/RetryPanel';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { TextField } from '../components/TextField';
import { ToastCard } from '../components/ToastCard';
import { Typography } from '../components/Typography';
import { CircleEmptyState } from '../features/circles/components/CircleEmptyState';
import { CircleHero } from '../features/circles/components/CircleHero';
import { CircleInvitePanel } from '../features/circles/components/CircleInvitePanel';
import { CircleMemberRow } from '../features/circles/components/CircleMemberRow';
import { useReducedMotion } from '../features/rooms/hooks/useReducedMotion';
import {
  addEventsCircleMember,
  fetchEventsCircleMembers,
  getCachedEventsCircleMembers,
  removeEventsCircleMember,
  searchUsersForPrayerCircle,
  type PrayerCircleMember,
  type PrayerCircleUserSuggestion,
} from '../lib/api/data';
import { PROFILE_ROW_GAP, PROFILE_SECTION_GAP } from '../theme/figmaV2Layout';
import { sectionGap } from '../theme/layout';
import { circleSurface, colors, motion, radii, spacing } from '../theme/tokens';

function makeInviteMessage() {
  return 'Join my Events Circle on Egregor so we can join live events together.';
}

export function EventsCircleScreen() {
  const palette = circleSurface.events;
  const reduceMotionEnabled = useReducedMotion();
  const sectionSettle = useMemo(() => new Animated.Value(0), []);

  const initialMembersRef = useRef<PrayerCircleMember[]>(getCachedEventsCircleMembers() ?? []);
  const hasHydratedMembersRef = useRef(initialMembersRef.current.length > 0);
  const [members, setMembers] = useState<PrayerCircleMember[]>(initialMembersRef.current);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PrayerCircleUserSuggestion[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(initialMembersRef.current.length === 0);
  const [refreshingMembers, setRefreshingMembers] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [manageTab, setManageTab] = useState<'invite' | 'search'>('search');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reduceMotionEnabled) {
      sectionSettle.setValue(1);
      return;
    }

    sectionSettle.setValue(0);
    const animation = Animated.timing(sectionSettle, {
      duration: motion.durationMs.slow,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotionEnabled, sectionSettle]);

  const getSectionStyle = (index: number) => {
    if (reduceMotionEnabled) {
      return styles.noMotion;
    }

    return {
      opacity: sectionSettle.interpolate({
        inputRange: [0, 1],
        outputRange: [0.86, 1],
      }),
      transform: [
        {
          translateY: sectionSettle.interpolate({
            inputRange: [0, 1],
            outputRange: [12 + index * 4, 0],
          }),
        },
      ],
    };
  };

  const loadMembers = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshingMembers(true);
    } else if (!hasHydratedMembersRef.current) {
      setLoadingMembers(true);
    }

    try {
      const nextMembers = await fetchEventsCircleMembers();
      setMembers(nextMembers);
      hasHydratedMembersRef.current = nextMembers.length > 0;
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to load your events circle.',
      );
    } finally {
      setLoadingMembers(false);
      setRefreshingMembers(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const run = async () => {
        setSearchingUsers(true);
        try {
          const nextSuggestions = await searchUsersForPrayerCircle(query, 12);
          setSuggestions(nextSuggestions);
        } catch {
          setSuggestions([]);
        } finally {
          setSearchingUsers(false);
        }
      };

      void run();
    }, 280);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2600);

    return () => {
      clearTimeout(timer);
    };
  }, [toastMessage]);

  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !memberIds.has(suggestion.userId)),
    [memberIds, suggestions],
  );
  const suggestionsBadgeLabel = searchingUsers
    ? 'Searching'
    : `${Math.min(visibleSuggestions.length, 6)} matches`;

  const onAddMember = async (userId: string) => {
    setUpdatingMemberId(userId);
    try {
      await addEventsCircleMember(userId);
      await loadMembers(true);
      setError(null);
      setToastMessage('Member added to your events circle.');
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Could not add user to events circle.',
      );
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const onConfirmRemove = (member: PrayerCircleMember) => {
    Alert.alert(
      'Remove from circle?',
      `Are you sure you want to remove ${member.displayName} from your Events Circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setUpdatingMemberId(member.userId);
              try {
                await removeEventsCircleMember(member.userId);
                await loadMembers(true);
                setError(null);
                setToastMessage(`${member.displayName} removed from your events circle.`);
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Could not remove user.');
              } finally {
                setUpdatingMemberId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const onInviteWhatsApp = async () => {
    const text = encodeURIComponent(makeInviteMessage());
    const appUrl = `whatsapp://send?text=${text}`;
    const webUrl = `https://wa.me/?text=${text}`;
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
    setToastMessage('Invite opened in WhatsApp.');
  };

  const onInviteEmail = async () => {
    const subject = encodeURIComponent('Join my Events Circle on Egregor');
    const body = encodeURIComponent(makeInviteMessage());
    await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    setToastMessage('Invite draft opened in email.');
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <CircleHero
        memberCount={members.length}
        subtitle="Gather the people you trust so entering live collective rooms feels immediate and shared."
        title="Move as one field"
        variant="events"
      />

      <Animated.View style={getSectionStyle(0)}>
        <SegmentedTabs
          activeKey={manageTab}
          onChange={(nextKey) => {
            setManageTab(nextKey === 'invite' ? 'invite' : 'search');
          }}
          options={[
            { key: 'search', label: 'Add In App' },
            { key: 'invite', label: 'Invite Externally' },
          ]}
          style={styles.segmentedTabs}
        />
      </Animated.View>

      <Animated.View style={getSectionStyle(1)}>
        <View
          style={[
            styles.collectiveCard,
            {
              backgroundColor: palette.hero.statBackground,
              borderColor: palette.hero.statBorder,
            },
          ]}
        >
          <View style={styles.collectiveTitleRow}>
            <MaterialCommunityIcons color={palette.hero.badgeText} name="earth" size={16} />
            <Typography
              allowFontScaling={false}
              color={palette.hero.badgeText}
              variant="Caption"
              weight="bold"
            >
              Collective readiness
            </Typography>
          </View>
          <Typography
            allowFontScaling={false}
            color={palette.hero.statValue}
            variant="Body"
            weight="bold"
          >
            Build your outward event ally network.
          </Typography>
          <Typography allowFontScaling={false} color={palette.hero.statLabel} variant="Caption">
            Events Circle emphasizes shared entry into live rooms, global momentum, and coordinated
            participation.
          </Typography>
        </View>
      </Animated.View>

      {manageTab === 'search' ? (
        <Animated.View style={getSectionStyle(2)}>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: palette.search.panelBackground,
                borderColor: palette.search.panelBorder,
              },
            ]}
          >
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  {
                    backgroundColor: palette.member.avatarBackground,
                    borderColor: palette.member.avatarBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={palette.member.avatarText}
                  name="account-plus"
                  size={16}
                />
              </View>
              <View style={styles.sectionTitleWrap}>
                <Typography
                  allowFontScaling={false}
                  color={palette.search.rowName}
                  variant="Body"
                  weight="bold"
                >
                  Add members in app
                </Typography>
                <Typography
                  allowFontScaling={false}
                  color={palette.search.helperText}
                  variant="Caption"
                >
                  Search by display name and add people directly to your events circle.
                </Typography>
              </View>
              <Badge label={suggestionsBadgeLabel} tone={searchingUsers ? 'loading' : 'active'} />
            </View>

            <TextField
              accessibilityHint="Searches by display name."
              accessibilityLabel="Search users to add to your events circle"
              autoCapitalize="none"
              autoCorrect={false}
              helperText={searchingUsers ? 'Searching users...' : 'Search by display name'}
              label="Member search"
              onChangeText={setQuery}
              placeholder="Search users by display name"
              value={query}
            />

            {searchingUsers ? <ActivityIndicator color={colors.accentMintStart} /> : null}

            {visibleSuggestions.slice(0, 6).map((user) => (
              <View
                key={user.userId}
                style={[
                  styles.suggestionRow,
                  {
                    backgroundColor: palette.search.rowBackground,
                    borderColor: palette.search.rowBorder,
                  },
                ]}
              >
                <View style={styles.suggestionTextWrap}>
                  <Typography
                    allowFontScaling={false}
                    color={palette.search.rowName}
                    numberOfLines={1}
                    variant="Body"
                    weight="bold"
                  >
                    {user.displayName}
                  </Typography>
                  <Typography
                    allowFontScaling={false}
                    color={palette.search.rowMeta}
                    variant="Caption"
                  >
                    Add to your live-room allies
                  </Typography>
                </View>
                <PrimaryButton
                  loading={updatingMemberId === user.userId}
                  onPress={() => void onAddMember(user.userId)}
                  title="Add"
                />
              </View>
            ))}

            {query.trim().length > 0 && !searchingUsers && visibleSuggestions.length === 0 ? (
              <CircleEmptyState
                body="Try another name or invite people externally to build your events circle."
                iconName="account-search"
                title="No matching users found"
                variant="events"
              />
            ) : null}
          </View>
        </Animated.View>
      ) : (
        <Animated.View style={getSectionStyle(2)}>
          <CircleInvitePanel
            iconName="account-multiple-plus"
            subtitle="Invite people outside the app so your next live event room starts with trusted presence."
            title="Invite externally"
            variant="events"
          >
            <View style={styles.inviteRow}>
              <PrimaryButton onPress={() => void onInviteWhatsApp()} title="Invite via WhatsApp" />
              <SecondaryButton onPress={() => void onInviteEmail()} title="Invite via Email" />
            </View>
          </CircleInvitePanel>
        </Animated.View>
      )}

      <Animated.View style={getSectionStyle(3)}>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.member.panelBackground,
              borderColor: palette.member.panelBorder,
            },
          ]}
        >
          <View style={styles.membersHeaderRow}>
            <Typography
              allowFontScaling={false}
              color={palette.member.rowName}
              variant="H2"
              weight="bold"
            >
              Circle members
            </Typography>
            <View
              style={[
                styles.countPill,
                {
                  backgroundColor: palette.hero.statBackground,
                  borderColor: palette.hero.statBorder,
                },
              ]}
            >
              <Typography
                allowFontScaling={false}
                color={palette.hero.statValue}
                variant="Caption"
                weight="bold"
              >
                {members.length}
              </Typography>
            </View>
          </View>

          {loadingMembers ? (
            <LoadingStateCard
              compact
              minHeight={96}
              style={styles.memberLoadingCard}
              subtitle="Syncing your events circle members."
              title="Loading members"
            />
          ) : null}

          {!loadingMembers && members.length === 0 ? (
            <CircleEmptyState
              body="Invite someone from search or share your invite link to activate your events circle."
              iconName="earth"
              title="Your events circle is empty"
              variant="events"
            />
          ) : null}

          {!loadingMembers
            ? members.map((member, index) => (
                <CircleMemberRow
                  key={member.userId}
                  member={member}
                  onRemovePress={onConfirmRemove}
                  orderIndex={index}
                  updating={updatingMemberId === member.userId}
                  variant="events"
                />
              ))
            : null}

          <SecondaryButton
            loading={refreshingMembers}
            onPress={() => void loadMembers(true)}
            title="Refresh members"
          />
        </View>
      </Animated.View>

      {error ? (
        <Animated.View style={getSectionStyle(4)}>
          <RetryPanel
            loading={refreshingMembers}
            message={error}
            onRetry={() => {
              void loadMembers(true);
            }}
            retryLabel="Retry"
            style={styles.errorCard}
            title="Could not load events circle"
          />
        </Animated.View>
      ) : null}

      {toastMessage ? (
        <Animated.View style={getSectionStyle(5)}>
          <ToastCard message={toastMessage} title="Events circle updated" />
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
    paddingBottom: sectionGap,
  },
  countPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minWidth: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  errorCard: {
    minHeight: 46,
  },
  inviteRow: {
    gap: PROFILE_ROW_GAP,
  },
  membersHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberLoadingCard: {
    backgroundColor: circleSurface.events.member.panelBackground,
    borderColor: circleSurface.events.member.panelBorder,
  },
  noMotion: {
    opacity: 1,
  },
  collectiveCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  collectiveTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  segmentedTabs: {
    width: '100%',
  },
  sectionCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: PROFILE_SECTION_GAP,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  suggestionRow: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  suggestionTextWrap: {
    flex: 1,
    gap: 2,
  },
});
