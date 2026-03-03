import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

import { corsHeaders } from '../_shared/cors.ts';

interface PrayerAudioRequest {
  script?: string;
  voiceId?: string;
}

interface ElevenLabsVoiceSettings {
  similarity_boost?: number;
  stability?: number;
  speed?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface ElevenLabsAlignment {
  character_end_times_seconds?: number[];
  character_start_times_seconds?: number[];
  characters?: string[];
}

interface ElevenLabsTimestampResponse {
  alignment?: ElevenLabsAlignment | null;
  audio_base64?: string;
  normalized_alignment?: ElevenLabsAlignment | null;
}

interface TimedWord {
  endSeconds: number;
  index: number;
  startSeconds: number;
  word: string;
}

const DEFAULT_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_AUDIO_BUCKET = 'prayer-audio';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_CONTENT_TYPE = 'audio/mpeg';
const AUDIO_BUCKET_MAX_BYTES = 25 * 1024 * 1024;
const AUDIO_CACHE_VERSION = 'v2-word-timing';

type SupabaseAdminClient = ReturnType<typeof createClient>;

let ensureBucketPromise: Promise<void> | null = null;

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for audio storage.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAudioBucketName() {
  return Deno.env.get('ELEVENLABS_AUDIO_BUCKET')?.trim() || DEFAULT_AUDIO_BUCKET;
}

function getSignedUrlTtlSeconds() {
  const raw = Deno.env.get('ELEVENLABS_AUDIO_SIGNED_URL_TTL_SECONDS')?.trim();
  if (!raw) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  return Math.floor(parsed);
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureAudioBucket(client: SupabaseAdminClient, bucket: string) {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data, error } = await client.storage.getBucket(bucket);
      if (!error && data) {
        const currentLimit =
          typeof (data as { file_size_limit?: number | null }).file_size_limit === 'number'
            ? (data as { file_size_limit?: number | null }).file_size_limit
            : null;

        if (currentLimit !== null && currentLimit < AUDIO_BUCKET_MAX_BYTES) {
          await client.storage.updateBucket(bucket, {
            fileSizeLimit: AUDIO_BUCKET_MAX_BYTES,
            public: false,
          });
        }

        return;
      }

      const { error: createError } = await client.storage.createBucket(bucket, {
        fileSizeLimit: AUDIO_BUCKET_MAX_BYTES,
        public: false,
      });

      if (
        createError &&
        !/already exists|duplicate|conflict/i.test(createError.message || '')
      ) {
        throw createError;
      }
    })();
  }

  await ensureBucketPromise;
}

async function createSignedAudioUrl(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
  expiresInSeconds: number,
) {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

async function uploadAudioToStorage(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
  audioBytes: Uint8Array,
) {
  const { error } = await client.storage.from(bucket).upload(objectPath, audioBytes, {
    contentType: DEFAULT_CONTENT_TYPE,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload generated audio: ${error.message}`);
  }
}

async function uploadWordTimingsToStorage(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
  wordTimings: TimedWord[],
) {
  const payload = new TextEncoder().encode(JSON.stringify(wordTimings));
  const { error } = await client.storage.from(bucket).upload(objectPath, payload, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload word timings: ${error.message}`);
  }
}

function sanitizeWordTimings(value: unknown): TimedWord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const word = typeof row.word === 'string' ? row.word.trim() : '';
      const startSeconds = Number(row.startSeconds);
      const endSeconds = Number(row.endSeconds);

      if (!word || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
        return null;
      }

      return {
        endSeconds: Math.max(startSeconds, endSeconds),
        index,
        startSeconds: Math.max(0, startSeconds),
        word,
      } satisfies TimedWord;
    })
    .filter((entry): entry is TimedWord => entry !== null);

  return parsed;
}

async function fetchStoredWordTimings(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
) {
  const { data, error } = await client.storage.from(bucket).download(objectPath);
  if (error || !data) {
    return [];
  }

  try {
    const payload = JSON.parse(await data.text()) as unknown;
    return sanitizeWordTimings(payload);
  } catch {
    return [];
  }
}

function decodeBase64ToUint8Array(base64: string) {
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function toWordTimingsFromAlignment(alignment: ElevenLabsAlignment | null | undefined): TimedWord[] {
  if (!alignment) {
    return [];
  }

  const characters = Array.isArray(alignment.characters) ? alignment.characters : [];
  const starts = Array.isArray(alignment.character_start_times_seconds)
    ? alignment.character_start_times_seconds
    : [];
  const ends = Array.isArray(alignment.character_end_times_seconds)
    ? alignment.character_end_times_seconds
    : [];
  const count = Math.min(characters.length, starts.length, ends.length);

  if (count <= 0) {
    return [];
  }

  const words: TimedWord[] = [];
  let buffer = '';
  let wordStart = -1;
  let wordEnd = -1;

  const flushWord = () => {
    const value = buffer.trim();
    if (!value || wordStart < 0 || wordEnd < 0) {
      buffer = '';
      wordStart = -1;
      wordEnd = -1;
      return;
    }

    words.push({
      endSeconds: Math.max(wordStart, wordEnd),
      index: words.length,
      startSeconds: Math.max(0, wordStart),
      word: value,
    });

    buffer = '';
    wordStart = -1;
    wordEnd = -1;
  };

  for (let index = 0; index < count; index += 1) {
    const character = characters[index] ?? '';
    const startSeconds = Number(starts[index]);
    const endSeconds = Number(ends[index]);
    const isWhitespace = /\s/.test(character);

    if (isWhitespace) {
      flushWord();
      continue;
    }

    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
      continue;
    }

    if (wordStart < 0) {
      wordStart = startSeconds;
    }

    wordEnd = endSeconds;
    buffer += character;
  }

  flushWord();
  return words;
}

function sanitizeVoiceSettings(value: unknown): ElevenLabsVoiceSettings | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const result: ElevenLabsVoiceSettings = {};

  if (typeof source.stability === 'number') {
    result.stability = source.stability;
  }
  if (typeof source.similarity_boost === 'number') {
    result.similarity_boost = source.similarity_boost;
  }
  if (typeof source.style === 'number') {
    result.style = source.style;
  }
  if (typeof source.speed === 'number') {
    result.speed = source.speed;
  }
  if (typeof source.use_speaker_boost === 'boolean') {
    result.use_speaker_boost = source.use_speaker_boost;
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function fetchVoiceSettings(
  elevenLabsApiKey: string,
  voiceId: string,
): Promise<ElevenLabsVoiceSettings | null> {
  const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}/settings`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return sanitizeVoiceSettings(payload);
}

Deno.serve(async (request) => {
  try {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenLabsApiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let payload: PrayerAudioRequest;

  try {
    payload = (await request.json()) as PrayerAudioRequest;
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const script = payload.script?.trim();
  if (!script) {
    return new Response(JSON.stringify({ error: 'script is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const configuredDefaultVoiceId = Deno.env.get('ELEVENLABS_DEFAULT_VOICE_ID')?.trim();
  const voiceId = payload.voiceId?.trim() || configuredDefaultVoiceId || DEFAULT_VOICE_ID;
  const modelId = Deno.env.get('ELEVENLABS_MODEL_ID')?.trim() || DEFAULT_MODEL_ID;
  const voiceSettings = await fetchVoiceSettings(elevenLabsApiKey, voiceId);
  const audioBucket = getAudioBucketName();
  const signedUrlTtlSeconds = getSignedUrlTtlSeconds();
  const supabaseAdmin = getSupabaseAdminClient();

  await ensureAudioBucket(supabaseAdmin, audioBucket);

  const scriptFingerprint = await sha256Hex(
    `${AUDIO_CACHE_VERSION}|${voiceId}|${modelId}|${script}`,
  );
  const objectPath = `${voiceId}/${modelId}/${scriptFingerprint}.mp3`;
  const timingObjectPath = `${voiceId}/${modelId}/${scriptFingerprint}.timings.json`;

  const cachedAudioUrl = await createSignedAudioUrl(
    supabaseAdmin,
    audioBucket,
    objectPath,
    signedUrlTtlSeconds,
  );

  if (cachedAudioUrl) {
    const cachedWordTimings = await fetchStoredWordTimings(
      supabaseAdmin,
      audioBucket,
      timingObjectPath,
    );

    return new Response(
      JSON.stringify({
        audioUrl: cachedAudioUrl,
        contentType: DEFAULT_CONTENT_TYPE,
        voiceId,
        wordTimings: cachedWordTimings,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }

  const requestBody: Record<string, unknown> = {
    model_id: modelId,
    text: script,
  };

  if (voiceSettings) {
    requestBody.voice_settings = voiceSettings;
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: 'ElevenLabs request failed', detail: errorText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });
  }

  const timestampPayload = (await response.json()) as ElevenLabsTimestampResponse;
  const audioBase64 = timestampPayload.audio_base64?.trim();

  if (!audioBase64) {
    return new Response(JSON.stringify({ error: 'ElevenLabs response missing audio data' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });
  }

  const audioBytes = decodeBase64ToUint8Array(audioBase64);
  const alignment = timestampPayload.normalized_alignment ?? timestampPayload.alignment;
  const wordTimings = toWordTimingsFromAlignment(alignment);

  await uploadAudioToStorage(supabaseAdmin, audioBucket, objectPath, audioBytes);
  await uploadWordTimingsToStorage(supabaseAdmin, audioBucket, timingObjectPath, wordTimings);

  const audioUrl = await createSignedAudioUrl(
    supabaseAdmin,
    audioBucket,
    objectPath,
    signedUrlTtlSeconds,
  );

  if (!audioUrl) {
    return new Response(JSON.stringify({ error: 'Failed to create signed audio URL after upload' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({
      audioUrl,
      contentType: DEFAULT_CONTENT_TYPE,
      voiceId,
      wordTimings,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown function error';
    return new Response(JSON.stringify({ error: 'generate-prayer-audio failed', detail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
