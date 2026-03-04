import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import globeFallbackAnimation from '../../assets/lottie/globe-fallback.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';

import type { EventsStackParamList } from '../app/navigation/types';
import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { fetchEventById, fetchEventLibraryItemById } from '../lib/api/data';
import { generatePrayerAudio, type TimedWord } from '../lib/api/functions';
import { configureAudioForPlayback, createPlayer, type ManagedAudioPlayer } from '../lib/audio';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { sectionGap } from '../theme/layout';
import { colors, radii, spacing } from '../theme/tokens';

type EventRoomRoute = RouteProp<EventsStackParamList, 'EventRoom'>;
type EventNavigation = NativeStackNavigationProp<EventsStackParamList, 'EventRoom'>;

const VOICE_OPTIONS = ['Oliver', 'Amaya', 'Rainbird', 'Dominic'] as const;
const DEFAULT_ELEVENLABS_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';
const MAX_SCRIPT_PARAGRAPH_CHARS = 96;
const MAX_TIMED_WORDS_PER_PARAGRAPH = 14;
const MAX_SCRIPT_LINES = 4;
const ELEVENLABS_VOICE_ID_BY_LABEL: Partial<Record<(typeof VOICE_OPTIONS)[number], string>> = {
  Oliver: 'jfIS2w2yJi0grJZPyEsk',
  Amaya: 'BFvr34n3gOoz0BAf9Rwn',
  Rainbird: 'bgU7lBMo69PNEOWHFqxM',
  Dominic: 'V904i8ujLitGpMyoTznT',
};

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(1, '0');
  const seconds = (clamped % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function sanitizeScriptParagraph(paragraph: string) {
  const withoutMarkdownHeadings = paragraph
    .replace(/^\*\*\s*(grounding|prayer|closing)\s*\*\*\s*[:\-–—]?\s*/i, '')
    .replace(/^(grounding|prayer|closing)\s*[:\-–—]\s*/i, '')
    .replace(/\*\*/g, '');

  return withoutMarkdownHeadings.trim();
}

function splitLongParagraph(paragraph: string, maxChars = MAX_SCRIPT_PARAGRAPH_CHARS) {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 1) {
    return [paragraph];
  }

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      chunks.push(sentence.trim());
    }
  }

  if (buffer) {
    chunks.push(buffer.trim());
  }

  return chunks.length > 0 ? chunks : [paragraph];
}

function splitScriptIntoParagraphs(script: string) {
  const normalized = script.trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => sanitizeScriptParagraph(part))
    .filter((part) => part.length > 0);

  if (paragraphs.length > 1) {
    return paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  const singleParagraph = paragraphs[0] ?? '';
  if (!singleParagraph) {
    return [];
  }

  const sentences = singleParagraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 2) {
    return [singleParagraph];
  }

  const fallbackParagraphs: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= 240) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      fallbackParagraphs.push(buffer.trim());
      buffer = sentence;
    } else {
      fallbackParagraphs.push(sentence.trim());
    }
  }

  if (buffer) {
    fallbackParagraphs.push(buffer.trim());
  }

  if (fallbackParagraphs.length > 0) {
    return fallbackParagraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  return splitLongParagraph(singleParagraph);
}

interface TimedWordParagraph {
  endIndex: number;
  startIndex: number;
  words: TimedWord[];
}

function groupTimedWordsIntoParagraphs(
  words: TimedWord[],
  maxWordsPerParagraph = MAX_TIMED_WORDS_PER_PARAGRAPH,
) {
  if (words.length === 0) {
    return [] as TimedWordParagraph[];
  }

  const paragraphs: TimedWordParagraph[] = [];
  let current: TimedWord[] = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }

    paragraphs.push({
      endIndex: current[current.length - 1]?.index ?? 0,
      startIndex: current[0]?.index ?? 0,
      words: current,
    });
    current = [];
  };

  words.forEach((word) => {
    current.push(word);

    const hasSentenceEnding = /[.!?]["']?$/.test(word.word);
    const reachedMax = current.length >= maxWordsPerParagraph;
    const shouldBreak = reachedMax || (hasSentenceEnding && current.length >= 10);

    if (shouldBreak) {
      flush();
    }
  });

  flush();
  return paragraphs;
}

function buildPreviewParagraphsFromScript(script: string) {
  const normalized = script
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((line) => sanitizeScriptParagraph(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return [] as string[];
  }

  const words = normalized.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [] as string[];
  }

  const pseudoTimedWords: TimedWord[] = words.map((word, index) => ({
    endSeconds: index + 0.2,
    index,
    startSeconds: index,
    word,
  }));

  return groupTimedWordsIntoParagraphs(pseudoTimedWords, MAX_TIMED_WORDS_PER_PARAGRAPH).map(
    (paragraph) => paragraph.words.map((word) => word.word).join(' ').trim(),
  );
}

function findActiveTimedWordIndex(words: TimedWord[], elapsedMillis: number) {
  if (words.length === 0) {
    return -1;
  }

  const elapsedSeconds = elapsedMillis / 1000;
  const first = words[0];
  const last = words[words.length - 1];

  if (elapsedSeconds <= (first?.startSeconds ?? 0)) {
    return first?.index ?? 0;
  }

  if (elapsedSeconds >= (last?.endSeconds ?? 0)) {
    return last?.index ?? words.length - 1;
  }

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!word) {
      continue;
    }

    if (elapsedSeconds >= word.startSeconds && elapsedSeconds <= word.endSeconds) {
      return word.index;
    }

    const next = words[index + 1];
    if (next && elapsedSeconds > word.endSeconds && elapsedSeconds < next.startSeconds) {
      return next.index;
    }
  }

  return last?.index ?? words.length - 1;
}

export function EventRoomScreen() {
  const navigation = useNavigation<EventNavigation>();
  const route = useRoute<EventRoomRoute>();

  const [selectedVoice, setSelectedVoice] = useState<(typeof VOICE_OPTIONS)[number]>('Oliver');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventTitle, setEventTitle] = useState(route.params?.eventTitle?.trim() || 'Event Room');
  const [eventBody, setEventBody] = useState('');
  const [eventScript, setEventScript] = useState(route.params?.scriptText?.trim() || '');
  const [eventDurationMinutes, setEventDurationMinutes] = useState(route.params?.durationMinutes ?? 10);
  const [eventStartAt, setEventStartAt] = useState(
    route.params?.scheduledStartAt?.trim() || new Date().toISOString(),
  );

  const [timedWords, setTimedWords] = useState<TimedWord[]>([]);
  const [playerPositionMillis, setPlayerPositionMillis] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const playPulseRef = useRef<LottieView>(null);
  const autoStartTriggeredRef = useRef(false);
  const activePlayerRef = useRef<ManagedAudioPlayer | null>(null);
  const activePlayerKeyRef = useRef<string | null>(null);
  const activePlayerUnsubscribeRef = useRef<(() => void) | null>(null);

  const startMillis = useMemo(() => new Date(eventStartAt).getTime(), [eventStartAt]);
  const durationMillis = useMemo(
    () => Math.max(1, eventDurationMinutes) * 60 * 1000,
    [eventDurationMinutes],
  );
  const endMillis = useMemo(() => startMillis + durationMillis, [durationMillis, startMillis]);

  const hasStarted = Number.isFinite(startMillis) ? nowTick >= startMillis : true;
  const hasEnded = Number.isFinite(endMillis) ? nowTick >= endMillis : false;
  const remainingUntilStartMillis = Math.max(0, startMillis - nowTick);
  const remainingEventMillis = hasStarted ? Math.max(0, endMillis - nowTick) : durationMillis;
  const elapsedFromScheduleMillis = hasStarted
    ? Math.max(0, Math.min(durationMillis, nowTick - startMillis))
    : 0;

  const activeElapsedMillis = hasStarted ? elapsedFromScheduleMillis : playerPositionMillis;
  const progress = durationMillis > 0 ? Math.min(1, activeElapsedMillis / durationMillis) : 0;

  const elapsedLabel = formatClock(activeElapsedMillis / 1000);
  const remainingLabel = formatClock(remainingEventMillis / 1000);
  const startCountdownLabel = formatClock(remainingUntilStartMillis / 1000);

  const activeVoiceId = ELEVENLABS_VOICE_ID_BY_LABEL[selectedVoice] ?? DEFAULT_ELEVENLABS_VOICE_ID;
  const activeAudioKey = useMemo(
    () => `${activeVoiceId}|${eventScript.trim()}`,
    [activeVoiceId, eventScript],
  );

  const closeAllSelectors = useCallback(() => {
    setIsVoiceMenuOpen(false);
    setIsInviteOpen(false);
  }, []);

  const disposeActivePlayer = useCallback(() => {
    activePlayerRef.current?.pause();
    activePlayerUnsubscribeRef.current?.();
    activePlayerUnsubscribeRef.current = null;
    activePlayerRef.current?.dispose();
    activePlayerRef.current = null;
    activePlayerKeyRef.current = null;
  }, []);

  const stopPlayback = useCallback(async () => {
    const activePlayer = activePlayerRef.current;
    if (!activePlayer) {
      return;
    }

    try {
      await activePlayer.stop();
    } catch {
      activePlayer.pause();
    }

    setIsRunning(false);
    setPlayerPositionMillis(0);
  }, []);

  const onExitSession = useCallback(() => {
    closeAllSelectors();

    void (async () => {
      await stopPlayback();
      disposeActivePlayer();
      navigation.goBack();
    })();
  }, [closeAllSelectors, disposeActivePlayer, navigation, stopPlayback]);

  const ensureAudioPlayer = useCallback(async () => {
    const nextScript = eventScript.trim();
    if (!nextScript) {
      throw new Error('No event script is available yet.');
    }

    if (activePlayerRef.current && activePlayerKeyRef.current === activeAudioKey) {
      return activePlayerRef.current;
    }

    setLoadingAudio(true);
    try {
      await configureAudioForPlayback();

      const audioResponse = await generatePrayerAudio({
        script: nextScript,
        voiceId: activeVoiceId,
      });

      const audioUrl = audioResponse?.audioUrl?.trim();
      const audioBase64 = audioResponse?.audioBase64?.trim();
      const contentType = audioResponse?.contentType?.trim() || 'audio/mpeg';
      const nextTimedWords = (audioResponse?.wordTimings ?? [])
        .filter(
          (word) =>
            typeof word?.word === 'string' &&
            Number.isFinite(word?.startSeconds) &&
            Number.isFinite(word?.endSeconds),
        )
        .sort((left, right) => left.startSeconds - right.startSeconds)
        .map((word, index) => ({
          ...word,
          endSeconds: Math.max(word.startSeconds, word.endSeconds),
          index,
          startSeconds: Math.max(0, word.startSeconds),
          word: word.word.trim(),
        }))
        .filter((word) => word.word.length > 0);

      if (!audioUrl && !audioBase64) {
        throw new Error('Audio generation returned an empty payload.');
      }

      const sourceUri = audioUrl || `data:${contentType};base64,${audioBase64}`;
      setTimedWords(nextTimedWords);

      disposeActivePlayer();

      const player = createPlayer(sourceUri);
      activePlayerUnsubscribeRef.current = player.subscribe((status) => {
        setPlayerPositionMillis(Math.max(0, status.positionMillis));
        if (status.didJustFinish) {
          setIsRunning(false);
        }
      });

      activePlayerRef.current = player;
      activePlayerKeyRef.current = activeAudioKey;

      return player;
    } finally {
      setLoadingAudio(false);
    }
  }, [activeAudioKey, activeVoiceId, disposeActivePlayer, eventScript]);

  const startPlaybackAtScheduleOffset = useCallback(async () => {
    if (!hasStarted || hasEnded) {
      return;
    }

    const player = await ensureAudioPlayer();
    const offsetMillis = Math.max(0, Math.min(durationMillis, nowTick - startMillis));
    await player.seekTo(offsetMillis);
    player.play();
    setIsRunning(true);
    setError(null);
  }, [durationMillis, ensureAudioPlayer, hasEnded, hasStarted, nowTick, startMillis]);

  const onTogglePlayback = useCallback(async () => {
    closeAllSelectors();

    if (!hasStarted) {
      setError('This event has not started yet.');
      return;
    }

    if (hasEnded) {
      setError('This event has already ended.');
      return;
    }

    if (isRunning) {
      activePlayerRef.current?.pause();
      setIsRunning(false);
      return;
    }

    try {
      await startPlaybackAtScheduleOffset();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to start event audio.';
      setError(message);
      setIsRunning(false);
    }
  }, [closeAllSelectors, hasEnded, hasStarted, isRunning, startPlaybackAtScheduleOffset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateEvent = async () => {
      try {
        setLoadingEvent(true);

        const routeScript = route.params?.scriptText?.trim();
        if (routeScript && routeScript.length > 0) {
          if (!active) {
            return;
          }

          setEventScript(routeScript);
          setEventBody(routeScript);
          setEventTitle(route.params?.eventTitle?.trim() || 'Event Room');
          setEventDurationMinutes(route.params?.durationMinutes ?? 10);
          setEventStartAt(route.params?.scheduledStartAt?.trim() || new Date().toISOString());
          setError(null);
          return;
        }

        const templateId = route.params?.eventTemplateId?.trim();
        if (templateId) {
          const template = await fetchEventLibraryItemById(templateId);
          if (!active) {
            return;
          }

          if (template) {
            setEventTitle(route.params?.eventTitle?.trim() || template.title);
            setEventBody(template.body);
            setEventScript(template.script || template.body);
            setEventDurationMinutes(route.params?.durationMinutes ?? template.durationMinutes ?? 10);
            setEventStartAt(route.params?.scheduledStartAt?.trim() || new Date().toISOString());
            setError(null);
            return;
          }
        }

        const eventId = route.params?.eventId?.trim();
        if (eventId) {
          const event = await fetchEventById(eventId);
          if (!active) {
            return;
          }

          if (event) {
            const fallbackScript = [event.description?.trim(), event.hostNote?.trim()]
              .filter((value): value is string => Boolean(value && value.length > 0))
              .join('\n\n');

            setEventTitle(route.params?.eventTitle?.trim() || event.title);
            setEventBody(event.description?.trim() || 'Hold intention for this live room.');
            setEventScript(fallbackScript || 'We gather in shared intention and focus for this event.');
            setEventDurationMinutes(route.params?.durationMinutes ?? event.durationMinutes ?? 10);
            setEventStartAt(route.params?.scheduledStartAt?.trim() || event.startsAt || new Date().toISOString());
            setError(null);
            return;
          }
        }

        if (!active) {
          return;
        }

        setError('Could not find event details for this room.');
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load event room.');
      } finally {
        if (active) {
          setLoadingEvent(false);
        }
      }
    };

    void hydrateEvent();

    return () => {
      active = false;
    };
  }, [route.params?.durationMinutes, route.params?.eventId, route.params?.eventTemplateId, route.params?.eventTitle, route.params?.scheduledStartAt, route.params?.scriptText]);

  useEffect(() => {
    setIsRunning(false);
    setPlayerPositionMillis(0);
    setTimedWords([]);
    autoStartTriggeredRef.current = false;
    disposeActivePlayer();
  }, [activeAudioKey, disposeActivePlayer, eventStartAt]);

  useEffect(() => {
    return () => {
      void stopPlayback();
      disposeActivePlayer();
    };
  }, [disposeActivePlayer, stopPlayback]);

  useEffect(() => {
    if (!playPulseRef.current) {
      return;
    }

    if (isRunning) {
      playPulseRef.current.play();
      return;
    }

    playPulseRef.current.reset();
  }, [isRunning]);

  useEffect(() => {
    if (!hasStarted || hasEnded || loadingEvent || autoStartTriggeredRef.current) {
      return;
    }

    autoStartTriggeredRef.current = true;

    void startPlaybackAtScheduleOffset().catch((nextError) => {
      const message = nextError instanceof Error ? nextError.message : 'Failed to start event audio.';
      setError(message);
      setIsRunning(false);
    });
  }, [hasEnded, hasStarted, loadingEvent, startPlaybackAtScheduleOffset]);

  useEffect(() => {
    if (!hasEnded) {
      return;
    }

    setIsRunning(false);
    if (activePlayerRef.current) {
      void activePlayerRef.current.stop();
    }
  }, [hasEnded]);

  const activeTimedWordIndex = useMemo(
    () => findActiveTimedWordIndex(timedWords, activeElapsedMillis),
    [activeElapsedMillis, timedWords],
  );
  const timedWordParagraphs = useMemo(() => groupTimedWordsIntoParagraphs(timedWords), [timedWords]);
  const activeTimedParagraph = useMemo(() => {
    if (timedWordParagraphs.length === 0) {
      return null;
    }

    if (activeTimedWordIndex < 0) {
      return timedWordParagraphs[0] ?? null;
    }

    return (
      timedWordParagraphs.find(
        (paragraph) =>
          activeTimedWordIndex >= paragraph.startIndex && activeTimedWordIndex <= paragraph.endIndex,
      ) ??
      timedWordParagraphs[timedWordParagraphs.length - 1] ??
      null
    );
  }, [activeTimedWordIndex, timedWordParagraphs]);

  const scriptParagraphs = useMemo(() => {
    const previewParagraphs = buildPreviewParagraphsFromScript(eventScript);
    if (previewParagraphs.length > 0) {
      return previewParagraphs;
    }

    return splitScriptIntoParagraphs(eventScript);
  }, [eventScript]);

  const fallbackParagraphIndex = useMemo(() => {
    if (scriptParagraphs.length <= 1 || durationMillis <= 0) {
      return 0;
    }

    const normalizedProgress = Math.min(0.999999, Math.max(0, activeElapsedMillis / durationMillis));
    return Math.min(scriptParagraphs.length - 1, Math.floor(normalizedProgress * scriptParagraphs.length));
  }, [activeElapsedMillis, durationMillis, scriptParagraphs.length]);

  const fallbackParagraph = scriptParagraphs[fallbackParagraphIndex] ?? '';

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.screenContent}
      scrollable={false}
      variant="events"
      withTabBarInset={false}
    >
      <Pressable onPress={closeAllSelectors} style={styles.container}>
        <View style={styles.topActionsRow}>
          <View style={styles.iconSpacer} />

          <Pressable
            accessibilityLabel="Close event room"
            onPress={onExitSession}
            style={({ pressed }) => [styles.iconCircleButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialCommunityIcons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        <View style={styles.headerBlock}>
          <Typography allowFontScaling={false} style={styles.prayerTitle} variant="H1" weight="bold">
            {eventTitle}
          </Typography>
        </View>

        <View style={styles.selectorRow}>
          <View style={styles.selectorContainer}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
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
            <View style={[styles.selectorButton, styles.minutesSelectorButton]}>
              <Typography
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.75}
                numberOfLines={1}
                style={styles.selectorValue}
                variant="Body"
                weight="bold"
              >
                {hasStarted ? `${remainingLabel} left` : `${startCountdownLabel} to start`}
              </Typography>
              <MaterialCommunityIcons
                color={hasStarted ? colors.success : colors.warning}
                name={hasStarted ? 'clock-check-outline' : 'clock-outline'}
                size={20}
              />
            </View>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <Pressable
            disabled={loadingEvent || loadingAudio || !eventScript.trim() || !hasStarted || hasEnded}
            onPress={() => {
              void onTogglePlayback();
            }}
            style={({ pressed }) => [styles.playPulseTap, pressed && styles.playPressed]}
          >
            <View style={styles.playPulseContainer}>
              <LottieView
                autoPlay={false}
                loop
                ref={playPulseRef}
                source={globeFallbackAnimation}
                style={styles.playPulseLottie}
              />
              <View style={styles.playButtonCore}>
                <MaterialCommunityIcons
                  color={figmaV2Reference.tabs.activeBorder}
                  name={isRunning ? 'pause' : 'play'}
                  size={42}
                />
              </View>
            </View>
          </Pressable>

          <View style={styles.scriptWrap}>
            {loadingEvent ? (
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
                Loading event details...
              </Typography>
            ) : activeTimedParagraph?.words.length ? (
              <View style={styles.scriptWordFlow}>
                {activeTimedParagraph.words.map((word) => {
                  const isActiveWord = word.index === activeTimedWordIndex;

                  return (
                    <Typography
                      key={`${word.index}-${word.startSeconds}-${word.word}`}
                      allowFontScaling={false}
                      style={[styles.scriptWord, isActiveWord && styles.scriptWordActive]}
                      variant="H2"
                      weight={isActiveWord ? 'bold' : 'medium'}
                    >
                      {`${word.word} `}
                    </Typography>
                  );
                })}
              </View>
            ) : eventScript ? (
              <View style={styles.scriptSyncWrap}>
                <Typography
                  allowFontScaling={false}
                  numberOfLines={MAX_SCRIPT_LINES}
                  style={styles.scriptTextActive}
                  variant="H2"
                  weight="bold"
                >
                  {fallbackParagraph}
                </Typography>
              </View>
            ) : (
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body">
                No script available for this event.
              </Typography>
            )}
          </View>

          {!hasStarted ? (
            <Typography allowFontScaling={false} color={colors.warning} variant="Caption">
              Event starts in {startCountdownLabel}. Audio will begin automatically.
            </Typography>
          ) : null}

          {hasEnded ? (
            <Typography allowFontScaling={false} color={colors.success} variant="Caption">
              This event has ended.
            </Typography>
          ) : null}

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
              {remainingLabel}
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
                  style={({ pressed }) => [styles.inviteOption, pressed && styles.dropdownOptionPressed]}
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
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body" weight="bold">
                {isMuted ? 'Unmute' : 'Mute'}
              </Typography>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsRunning(false);
                if (activePlayerRef.current) {
                  void activePlayerRef.current.stop();
                }
              }}
              style={({ pressed }) => [styles.bottomIconAction, pressed && styles.selectorPressed]}
            >
              <MaterialCommunityIcons color={colors.textPrimary} name="restore" size={30} />
              <Typography allowFontScaling={false} color={colors.textSecondary} variant="Body" weight="bold">
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
              <Typography allowFontScaling={false} style={styles.inviteText} variant="H2" weight="bold">
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
    marginTop: spacing.xs,
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
    justifyContent: 'flex-start',
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
  iconSpacer: {
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
  playButtonCore: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 0,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  playPulseContainer: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    height: 140,
    width: 140,
  },
  playPulseLottie: {
    height: 156,
    position: 'absolute',
    width: 156,
  },
  playPulseTap: {
    alignItems: 'center',
    justifyContent: 'center',
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
  screenContent: {
    flex: 1,
  },
  scriptSyncWrap: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'flex-start',
    maxHeight: 156,
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
  },
  scriptTextActive: {
    fontSize: 20,
    lineHeight: 29,
    maxWidth: '98%',
    textAlign: 'center',
  },
  scriptWord: {
    color: colors.textSecondary,
    fontSize: 20,
    letterSpacing: 0.1,
    lineHeight: 29,
    marginRight: 2,
  },
  scriptWordActive: {
    color: colors.textPrimary,
    textShadowColor: figmaV2Reference.tabs.activeBorder,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
    transform: [{ scale: 1.04 }],
  },
  scriptWordFlow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxHeight: 156,
    maxWidth: '98%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  scriptWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 0,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
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
