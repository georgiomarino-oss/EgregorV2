import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import {
  addPrayerCircleMember,
  fetchPrayerCircleMembers,
  removePrayerCircleMember,
  searchUsersForPrayerCircle,
  type PrayerCircleMember,
  type PrayerCircleUserSuggestion,
} from '../lib/api/data';
import { HOME_CARD_GAP, PROFILE_ROW_GAP, PROFILE_SECTION_GAP } from '../theme/figmaV2Layout';
import { colors, radii, spacing } from '../theme/tokens';

const REMOVE_ACTION_WIDTH = 76;

function makeInviteMessage() {
  return 'Join my Prayer Circle on Egregor so we can pray together in one shared flow.';
}

function SwipeToRemoveRow({
  member,
  onRemovePress,
}: {
  member: PrayerCircleMember;
  onRemovePress: (member: PrayerCircleMember) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const closeRow = useCallback(() => {
    openRef.current = false;
    Animated.spring(translateX, {
      bounciness: 0,
      speed: 16,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const openRow = useCallback(() => {
    openRef.current = true;
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
          if (member.isOwner) {
            return false;
          }
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6;
        },
        onPanResponderMove: (_event, gestureState) => {
          const base = openRef.current ? -REMOVE_ACTION_WIDTH : 0;
          const next = Math.max(-REMOVE_ACTION_WIDTH, Math.min(0, base + gestureState.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldOpen =
            gestureState.vx < -0.35 ||
            (!openRef.current && gestureState.dx < -36) ||
            (openRef.current && gestureState.dx < 14);

          if (shouldOpen) {
            openRow();
            return;
          }

          closeRow();
        },
        onPanResponderTerminate: () => {
          if (openRef.current) {
            openRow();
            return;
          }
          closeRow();
        },
      }),
    [closeRow, member.isOwner, openRow, translateX],
  );

  return (
    <View style={styles.swipeRowWrap}>
      {!member.isOwner ? (
        <View style={styles.removeActionContainer}>
          <Pressable
            onPress={() => {
              closeRow();
              onRemovePress(member);
            }}
            style={({ pressed }) => [styles.removeActionButton, pressed && styles.removePressed]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="minus" size={18} />
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
        {...(member.isOwner ? {} : panResponder.panHandlers)}
      >
        <SurfaceCard radius="md" style={styles.memberCard} variant="profileRow">
          <View style={styles.memberRow}>
            <Typography allowFontScaling={false} numberOfLines={1} style={styles.memberName} weight="medium">
              {member.displayName}
            </Typography>
            <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption" weight="bold">
              {member.isOwner ? 'Owner' : 'Member'}
            </Typography>
          </View>
        </SurfaceCard>
      </Animated.View>
    </View>
  );
}

export function PrayerCircleScreen() {
  const [members, setMembers] = useState<PrayerCircleMember[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PrayerCircleUserSuggestion[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [refreshingMembers, setRefreshingMembers] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshingMembers(true);
    } else {
      setLoadingMembers(true);
    }

    try {
      const nextMembers = await fetchPrayerCircleMembers();
      setMembers(nextMembers);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load your prayer circle.');
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

  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !memberIds.has(suggestion.userId)),
    [memberIds, suggestions],
  );

  const onAddMember = async (userId: string) => {
    setUpdatingMemberId(userId);
    try {
      await addPrayerCircleMember(userId);
      await loadMembers(true);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not add user to circle.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const onConfirmRemove = (member: PrayerCircleMember) => {
    Alert.alert(
      'Remove from circle?',
      `Are you sure you want to remove ${member.displayName} from your Prayer Circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setUpdatingMemberId(member.userId);
              try {
                await removePrayerCircleMember(member.userId);
                await loadMembers(true);
                setError(null);
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
  };

  const onInviteEmail = async () => {
    const subject = encodeURIComponent('Join my Prayer Circle on Egregor');
    const body = encodeURIComponent(makeInviteMessage());
    await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Screen ambientSource={ambientAnimation} contentContainerStyle={styles.content} variant="home">
      <View style={styles.headerBlock}>
        <Typography allowFontScaling={false} variant="H1" weight="bold">
          Prayer Circle
        </Typography>
        <Typography allowFontScaling={false} color={colors.textSecondary}>
          Add in-app members or invite people externally, then manage your circle.
        </Typography>
      </View>

      <SurfaceCard radius="xl" style={styles.section} variant="homeStat">
        <Typography allowFontScaling={false} variant="H2" weight="bold">
          Add members in app
        </Typography>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons color={colors.textSecondary} name="magnify" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search users by display name"
            placeholderTextColor={colors.textCaption}
            style={styles.searchInput}
            value={query}
          />
        </View>

        {searchingUsers ? <ActivityIndicator color={colors.accentMintStart} /> : null}

        {visibleSuggestions.slice(0, 6).map((user) => (
          <SurfaceCard key={user.userId} radius="md" style={styles.suggestionRow} variant="profileRow">
            <Typography allowFontScaling={false} numberOfLines={1} style={styles.suggestionName} weight="medium">
              {user.displayName}
            </Typography>
            <Button
              loading={updatingMemberId === user.userId}
              onPress={() => void onAddMember(user.userId)}
              title="Add"
              variant="sky"
            />
          </SurfaceCard>
        ))}

        {query.trim().length > 0 && !searchingUsers && visibleSuggestions.length === 0 ? (
          <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
            No matching users found.
          </Typography>
        ) : null}
      </SurfaceCard>

      <SurfaceCard radius="xl" style={styles.section} variant="homeAlert">
        <Typography allowFontScaling={false} variant="H2" weight="bold">
          Invite external users
        </Typography>
        <View style={styles.inviteRow}>
          <Button onPress={() => void onInviteWhatsApp()} title="Invite via WhatsApp" variant="primary" />
          <Button onPress={() => void onInviteEmail()} title="Invite via Email" variant="secondary" />
        </View>
      </SurfaceCard>

      <SurfaceCard radius="xl" style={styles.section} variant="homeStat">
        <View style={styles.membersHeaderRow}>
          <Typography allowFontScaling={false} variant="H2" weight="bold">
            Circle members
          </Typography>
          <Typography allowFontScaling={false} color={colors.textSecondary} variant="Caption" weight="bold">
            {members.length}
          </Typography>
        </View>

        {loadingMembers ? <ActivityIndicator color={colors.accentMintStart} /> : null}

        {!loadingMembers && members.length === 0 ? (
          <Typography allowFontScaling={false} color={colors.textCaption} variant="Caption">
            Your circle is empty.
          </Typography>
        ) : null}

        {!loadingMembers
          ? members.map((member) => (
              <SwipeToRemoveRow key={member.userId} member={member} onRemovePress={onConfirmRemove} />
            ))
          : null}

        <Button
          loading={refreshingMembers}
          onPress={() => void loadMembers(true)}
          title="Refresh members"
          variant="secondary"
        />
      </SurfaceCard>

      {error ? (
        <SurfaceCard radius="sm" style={styles.section} variant="homeAlert">
          <Typography allowFontScaling={false} color={colors.danger} variant="Caption">
            {error}
          </Typography>
        </SurfaceCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: HOME_CARD_GAP,
    paddingBottom: HOME_CARD_GAP,
  },
  headerBlock: {
    gap: PROFILE_ROW_GAP,
  },
  inviteRow: {
    gap: PROFILE_ROW_GAP,
  },
  memberCard: {
    minHeight: 44,
  },
  memberName: {
    flex: 1,
  },
  memberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  membersHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  removeActionButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
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
    transform: [{ scale: 0.96 }],
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: 0,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderMedium,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  section: {
    gap: PROFILE_SECTION_GAP,
  },
  suggestionName: {
    flex: 1,
  },
  suggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  swipeContent: {
    borderRadius: radii.md,
  },
  swipeRowWrap: {
    borderRadius: radii.md,
    minHeight: 44,
    overflow: 'hidden',
    position: 'relative',
  },
});
