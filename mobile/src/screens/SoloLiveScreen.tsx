import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { SoloStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchPrayerScriptVariantByTitle, fetchUserPreferences } from '../lib/api/data';
import { supabase } from '../lib/supabase';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type SoloLiveRoute = RouteProp<SoloStackParamList, 'SoloLive'>;
type SoloNavigation = NativeStackNavigationProp<SoloStackParamList, 'SoloLive'>;

const VOICE_OPTIONS = ['Marcus', 'Ayla', 'Noah'] as const;
const MINUTE_OPTIONS = [3, 5, 10] as const;

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(1, '0');
  const seconds = (clamped % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function SoloLiveScreen() {
  const navigation = useNavigation<SoloNavigation>();
  const route = useRoute<SoloLiveRoute>();

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Marcus');
  const [selectedMinutes, setSelectedMinutes] = useState<(typeof MINUTE_OPTIONS)[number]>(10);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isMinuteMenuOpen, setIsMinuteMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [scriptText, setScriptText] = useState(route.params?.scriptPreset ?? '');
  const [loadingScript, setLoadingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePrayerTitle = route.params?.intention?.trim() || 'Prayer';
  const totalSeconds = selectedMinutes * 60;

  const progress = useMemo(() => {
    if (totalSeconds <= 0) {
      return 0;
    }

    return Math.min(1, elapsedSeconds / totalSeconds);
  }, [elapsedSeconds, totalSeconds]);

  const elapsedLabel = useMemo(() => formatClock(elapsedSeconds), [elapsedSeconds]);
  const totalLabel = useMemo(() => formatClock(totalSeconds), [totalSeconds]);

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsMinuteMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  const loadSelectedScript = useCallback(async () => {
    if (!activePrayerTitle) {
      return;
    }

    setLoadingScript(true);
    try {
      const script = await fetchPrayerScriptVariantByTitle({
        durationMinutes: selectedMinutes,
        title: activePrayerTitle,
      });

      if (script) {
        setScriptText(script);
      } else {
        setScriptText(route.params?.scriptPreset ?? '');
      }
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load prayer script.');
    } finally {
      setLoadingScript(false);
    }
  }, [activePrayerTitle, route.params?.scriptPreset, selectedMinutes]);

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          return;
        }

        const preferences = await fetchUserPreferences(data.user.id);
        if (!active) {
          return;
        }

        const preferredMinutes = preferences.preferredSessionMinutes;
        if (MINUTE_OPTIONS.includes(preferredMinutes as (typeof MINUTE_OPTIONS)[number])) {
          setSelectedMinutes(preferredMinutes as (typeof MINUTE_OPTIONS)[number]);
        }

        if (preferences.preferredVoiceId?.trim()) {
          const matched = VOICE_OPTIONS.find(
            (voice) => voice.toLowerCase() === preferences.preferredVoiceId.trim().toLowerCase(),
          );
          if (matched) {
            setSelectedVoice(matched);
          }
        }
      } catch {
        // Non-blocking for UI.
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadSelectedScript();
  }, [loadSelectedScript]);

  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
  }, [selectedMinutes]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        if (next >= totalSeconds) {
          setIsRunning(false);
          return totalSeconds;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRunning, totalSeconds]);

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.screenContent}
      scrollable={false}
      variant="solo"
      withTabBarInset={false}
    >
      <Pressable onPress={closeAllSelectors} style={styles.container}>
        <View style={styles.topActionsRow}>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => setIsFavorite((current) => !current)}
            style={({ pressed }) => [styles.iconCircleButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Close solo session"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.iconCircleButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        <View style={styles.headerBlock}>
          <Typography
            allowFontScaling={false}
            style={styles.prayerTitle}
            variant="H1"
            weight="bold"
          >
            {activePrayerTitle}
          </Typography>
        </View>

        <View style={styles.selectorRow}>
          <View style={styles.selectorContainer}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsMinuteMenuOpen(false);
                setIsVoiceMenuOpen((current) => !current);
              }}
              style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorPressed]}
            >
              <View style={styles.voiceAvatar}>
                <MaterialCommunityIcons color={colors.textPrimary} name="account" size={13} />
              </View>
              <Typography
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.75}
                numberOfLines={1}
                style={styles.selectorValue}
                variant="Body"
                weight="bold"
              >
                {selectedVoice}
              </Typography>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name={isVoiceMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
              />
            </Pressable>

            {isVoiceMenuOpen ? (
              <SurfaceCard radius="md" style={styles.dropdownMenu}>
                {VOICE_OPTIONS.map((voice) => (
                  <Pressable
                    key={voice}
                    onPress={(event) => {
                      event.stopPropagation();
                      setSelectedVoice(voice);
                      setIsVoiceMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      selectedVoice === voice && styles.dropdownOptionActive,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <Typography
                      allowFontScaling={false}
                      color={selectedVoice === voice ? colors.textOnSky : colors.textPrimary}
                      variant="Body"
                      weight="bold"
                    >
                      {voice}
                    </Typography>
                  </Pressable>
                ))}
              </SurfaceCard>
            ) : null}
          </View>

          <View style={styles.selectorContainer}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsVoiceMenuOpen(false);
                setIsMinuteMenuOpen((current) => !current);
              }}
              style={({ pressed }) => [
                styles.selectorButton,
                styles.minutesSelectorButton,
                pressed && styles.selectorPressed,
              ]}
            >
              <Typography
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.75}
                numberOfLines={1}
                style={styles.selectorValue}
                variant="Body"
                weight="bold"
              >
                {`${selectedMinutes} min`}
              </Typography>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name={isMinuteMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
              />
            </Pressable>

            {isMinuteMenuOpen ? (
              <SurfaceCard radius="md" style={styles.dropdownMenu}>
                {MINUTE_OPTIONS.map((minutes) => (
                  <Pressable
                    key={minutes}
                    onPress={(event) => {
                      event.stopPropagation();
                      setSelectedMinutes(minutes);
                      setIsMinuteMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      selectedMinutes === minutes && styles.dropdownOptionActive,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <Typography
                      allowFontScaling={false}
                      color={selectedMinutes === minutes ? colors.textOnSky : colors.textPrimary}
                      variant="Body"
                      weight="bold"
                    >
                      {`${minutes} min`}
                    </Typography>
                  </Pressable>
                ))}
              </SurfaceCard>
            ) : null}
          </View>
        </View>

        <View style={styles.centerBlock}>
          <Pressable
            onPress={() => setIsRunning((current) => !current)}
            style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}
          >
            <MaterialCommunityIcons
              color={figmaV2Reference.backgrounds.solo.linear.colors[0]}
              name={isRunning ? 'pause' : 'play'}
              size={48}
            />
          </Pressable>
          <Typography
            allowFontScaling={false}
            color={colors.textSecondary}
            style={styles.readyLabel}
            variant="H2"
            weight="bold"
          >
            {isRunning ? 'Playing' : 'Ready to begin'}
          </Typography>

          <View style={styles.scriptWrap}>
            {loadingScript ? (
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
                Loading prayer script...
              </Typography>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scriptContent}
                showsVerticalScrollIndicator={false}
              >
                <Typography
                  allowFontScaling={false}
                  style={styles.scriptText}
                  variant="bodyLg"
                  weight="bold"
                >
                  {scriptText ||
                    route.params?.scriptPreset ||
                    'No script available for this prayer yet.'}
                </Typography>
              </ScrollView>
            )}
          </View>

          {error ? (
            <Typography allowFontScaling={false} color={colors.danger} variant="Caption">
              {error}
            </Typography>
          ) : null}
        </View>

        <View style={styles.bottomBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {elapsedLabel}
            </Typography>
            <Typography allowFontScaling={false} variant="H2" weight="bold">
              {totalLabel}
            </Typography>
          </View>

          {isInviteOpen ? (
            <SurfaceCard radius="md" style={styles.inviteMenu}>
              {['Invite your circle', 'Copy invite link', 'Share externally'].map((option) => (
                <Pressable
                  key={option}
                  onPress={(event) => {
                    event.stopPropagation();
                    setIsInviteOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.inviteOption,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <Typography allowFontScaling={false} variant="Body" weight="bold">
                    {option}
                  </Typography>
                </Pressable>
              ))}
            </SurfaceCard>
          ) : null}

          <View style={styles.bottomActionsRow}>
            <Pressable
              onPress={() => setIsMuted((current) => !current)}
              style={({ pressed }) => [styles.bottomIconAction, pressed && styles.selectorPressed]}
            >
              <MaterialCommunityIcons
                color={colors.textPrimary}
                name={isMuted ? 'volume-off' : 'volume-high'}
                size={30}
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
              onPress={() => {
                setElapsedSeconds(0);
                setIsRunning(false);
              }}
              style={({ pressed }) => [styles.bottomIconAction, pressed && styles.selectorPressed]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="restore" size={30} />
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
              onPress={(event) => {
                event.stopPropagation();
                setIsInviteOpen((current) => !current);
              }}
              style={({ pressed }) => [styles.inviteButton, pressed && styles.selectorPressed]}
            >
              <View style={styles.inviteIconCircle}>
                <MaterialCommunityIcons color={colors.textPrimary} name="account-group" size={16} />
              </View>
              <Typography
                allowFontScaling={false}
                style={styles.inviteText}
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
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  bottomBlock: {
    gap: spacing.xs,
  },
  bottomIconAction: {
    alignItems: 'center',
    borderRadius: radii.md,
    gap: spacing.xxs,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 0,
  },
  container: {
    flex: 1,
    gap: sectionGap,
  },
  dropdownMenu: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xxs / 2,
  },
  dropdownOption: {
    borderRadius: radii.sm,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  dropdownOptionActive: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.buttons.sky.border,
    borderWidth: 1,
  },
  dropdownOptionPressed: {
    transform: [{ scale: 0.99 }],
  },
  headerBlock: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconCircleButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  inviteIconCircle: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  inviteMenu: {
    gap: spacing.xxs,
  },
  inviteOption: {
    borderRadius: radii.sm,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  inviteText: {
    textTransform: 'none',
  },
  minutesSelectorButton: {
    justifyContent: 'center',
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.pill,
    height: 124,
    justifyContent: 'center',
    width: 124,
  },
  playPressed: {
    transform: [{ scale: 0.98 }],
  },
  prayerTitle: {
    textAlign: 'center',
  },
  progressFill: {
    backgroundColor: figmaV2Reference.buttons.sky.from,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 16,
    overflow: 'hidden',
  },
  readyLabel: {
    textAlign: 'center',
    textTransform: 'none',
  },
  screenContent: {
    flex: 1,
  },
  scriptContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scriptText: {
    textAlign: 'center',
  },
  scriptWrap: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.tabs.activeBackground,
    borderColor: figmaV2Reference.tabs.activeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorPressed: {
    transform: [{ scale: 0.98 }],
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectorValue: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 18,
    textTransform: 'none',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voiceAvatar: {
    alignItems: 'center',
    backgroundColor: figmaV2Reference.buttons.secondary.background,
    borderColor: figmaV2Reference.buttons.secondary.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
});
