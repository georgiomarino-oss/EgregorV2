import { supabase } from '../supabase';
import { clientEnv } from '../env';

export interface GeneratePrayerScriptInput {
  intention: string;
  length?: 'short' | 'medium' | 'long';
  mood?: string;
}

export interface GeneratePrayerScriptOutput {
  script: string;
}

export interface GeneratePrayerAudioInput {
  allowGeneration?: boolean;
  durationMinutes?: number;
  language?: string;
  prayerLibraryItemId?: string;
  prayerLibraryScriptId?: string;
  script: string;
  title?: string;
  voiceId?: string;
  voiceLabel?: string;
}

export interface TimedWord {
  endSeconds: number;
  index: number;
  startSeconds: number;
  word: string;
}

export interface GeneratePrayerAudioOutput {
  audioBase64?: string;
  audioUrl?: string;
  contentType?: string;
  voiceId?: string;
  wordTimings?: TimedWord[];
}

export interface GeneratedNewsDrivenEvent {
  category: string;
  country_code?: string | null;
  duration_minutes: number;
  event_day: string;
  headline: string;
  id: string;
  location_hint?: string | null;
  script_text: string;
  source_title: string | null;
  source_url: string;
  starts_at: string;
  summary: string;
}

export interface GenerateNewsDrivenEventsOutput {
  events: GeneratedNewsDrivenEvent[];
  generated: number;
  pulled?: number;
}

const DEFAULT_ELEVENLABS_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';
const PRAYER_AUDIO_CACHE_TTL_MS = 10 * 60 * 1000;
const PRAYER_AUDIO_CACHE_MAX_ENTRIES = 24;

interface PrayerAudioCacheEntry {
  cachedAt: number;
  data: GeneratePrayerAudioOutput;
}

const prayerAudioCache = new Map<string, PrayerAudioCacheEntry>();
const prayerAudioRequestCache = new Map<string, Promise<GeneratePrayerAudioOutput>>();

function normalizePrayerAudioScript(script: string) {
  return script.replace(/\s+/g, ' ').trim();
}

function buildPrayerAudioCacheKey(input: GeneratePrayerAudioInput) {
  const normalizedScript = normalizePrayerAudioScript(input.script);
  if (!normalizedScript) {
    return null;
  }

  const normalizedVoiceId = (input.voiceId?.trim() || DEFAULT_ELEVENLABS_VOICE_ID).trim();
  return `${normalizedVoiceId}|${normalizedScript}`;
}

function buildPrayerAudioRequestKey(input: GeneratePrayerAudioInput) {
  const cacheKey = buildPrayerAudioCacheKey(input);
  if (!cacheKey) {
    return null;
  }

  const generationMode = input.allowGeneration === true ? 'gen' : 'artifact-only';
  return `${cacheKey}|${generationMode}`;
}

function prunePrayerAudioCache(now: number) {
  for (const [cacheKey, entry] of prayerAudioCache.entries()) {
    if (now - entry.cachedAt > PRAYER_AUDIO_CACHE_TTL_MS) {
      prayerAudioCache.delete(cacheKey);
    }
  }

  if (prayerAudioCache.size <= PRAYER_AUDIO_CACHE_MAX_ENTRIES) {
    return;
  }

  const sortedEntries = Array.from(prayerAudioCache.entries()).sort(
    (left, right) => left[1].cachedAt - right[1].cachedAt,
  );
  const entriesToDrop = sortedEntries.slice(
    0,
    prayerAudioCache.size - PRAYER_AUDIO_CACHE_MAX_ENTRIES,
  );
  for (const [cacheKey] of entriesToDrop) {
    prayerAudioCache.delete(cacheKey);
  }
}

export function hasPrayerAudioCached(input: GeneratePrayerAudioInput) {
  const cacheKey = buildPrayerAudioCacheKey(input);
  if (!cacheKey) {
    return false;
  }

  const cachedEntry = prayerAudioCache.get(cacheKey);
  if (!cachedEntry) {
    return false;
  }

  const isFresh = Date.now() - cachedEntry.cachedAt <= PRAYER_AUDIO_CACHE_TTL_MS;
  if (!isFresh) {
    prayerAudioCache.delete(cacheKey);
    return false;
  }

  return true;
}

async function parseEdgeError(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Edge function failed with status ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string; error?: string; message?: string };
    return (
      parsed.detail?.trim() ||
      parsed.error?.trim() ||
      parsed.message?.trim() ||
      `Edge function failed with status ${response.status}.`
    );
  } catch {
    return text;
  }
}

async function invokeEdgeFunction<TOutput>(functionName: string, body: unknown): Promise<TOutput> {
  if (!clientEnv.supabaseUrl || !clientEnv.supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables in mobile/.env.');
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token?.trim();
  const authTokens = [accessToken, clientEnv.supabaseAnonKey].filter(
    (token, index, arr): token is string => Boolean(token && arr.indexOf(token) === index),
  );

  let lastError = 'Edge function request failed.';

  for (let index = 0; index < authTokens.length; index += 1) {
    const authToken = authTokens[index];
    if (!authToken) {
      continue;
    }

    const response = await fetch(`${clientEnv.supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: clientEnv.supabaseAnonKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as TOutput;
    }

    const detail = await parseEdgeError(response);
    lastError = detail;

    const canRetryWithNextToken =
      index < authTokens.length - 1 &&
      (response.status === 401 || detail.toLowerCase().includes('invalid jwt'));

    if (!canRetryWithNextToken) {
      break;
    }
  }

  throw new Error(lastError);
}

export async function generatePrayerScript(input: GeneratePrayerScriptInput) {
  const { data, error } = await supabase.functions.invoke<GeneratePrayerScriptOutput>(
    'generate-prayer-script',
    {
      body: input,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function generatePrayerAudio(input: GeneratePrayerAudioInput) {
  const payload: GeneratePrayerAudioInput = {
    ...input,
    allowGeneration: input.allowGeneration === true,
    script: normalizePrayerAudioScript(input.script),
    voiceId: input.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID,
  };
  if (!payload.script) {
    throw new Error('Cannot generate prayer audio for an empty script.');
  }
  const cacheKey = buildPrayerAudioCacheKey(payload);
  const requestKey = buildPrayerAudioRequestKey(payload);

  if (cacheKey) {
    const cachedEntry = prayerAudioCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.cachedAt <= PRAYER_AUDIO_CACHE_TTL_MS) {
      return cachedEntry.data;
    }

    prayerAudioCache.delete(cacheKey);

    const inFlightRequest = requestKey ? prayerAudioRequestCache.get(requestKey) : null;
    if (inFlightRequest) {
      return inFlightRequest;
    }
  }

  const requestPromise = invokeEdgeFunction<GeneratePrayerAudioOutput>(
    'generate-prayer-audio',
    payload,
  );

  if (requestKey) {
    prayerAudioRequestCache.set(requestKey, requestPromise);
  }

  try {
    const response = await requestPromise;

    if (cacheKey) {
      const now = Date.now();
      prayerAudioCache.set(cacheKey, {
        cachedAt: now,
        data: response,
      });
      prunePrayerAudioCache(now);
    }

    return response;
  } finally {
    if (requestKey) {
      prayerAudioRequestCache.delete(requestKey);
    }
  }
}

export function prefetchPrayerAudio(input: GeneratePrayerAudioInput) {
  const normalizedScript = normalizePrayerAudioScript(input.script);
  if (!normalizedScript) {
    return;
  }

  void generatePrayerAudio({
    ...input,
    script: normalizedScript,
  }).catch(() => {
    // Prefetch is best-effort and intentionally non-blocking.
  });
}

export async function generateNewsDrivenEvents() {
  return invokeEdgeFunction<GenerateNewsDrivenEventsOutput>('generate-news-driven-events', {});
}
