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

const DEFAULT_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_AUDIO_BUCKET = 'prayer-audio';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_CONTENT_TYPE = 'audio/mpeg';
const AUDIO_BUCKET_MAX_BYTES = 25 * 1024 * 1024;

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
  audioBuffer: ArrayBuffer,
) {
  const { error } = await client.storage.from(bucket).upload(objectPath, new Uint8Array(audioBuffer), {
    contentType: DEFAULT_CONTENT_TYPE,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload generated audio: ${error.message}`);
  }
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

  const scriptFingerprint = await sha256Hex(`${voiceId}|${modelId}|${script}`);
  const objectPath = `${voiceId}/${modelId}/${scriptFingerprint}.mp3`;

  const cachedAudioUrl = await createSignedAudioUrl(
    supabaseAdmin,
    audioBucket,
    objectPath,
    signedUrlTtlSeconds,
  );

  if (cachedAudioUrl) {
    return new Response(
      JSON.stringify({
        audioUrl: cachedAudioUrl,
        contentType: DEFAULT_CONTENT_TYPE,
        voiceId,
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

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
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

  const audioBuffer = await response.arrayBuffer();
  await uploadAudioToStorage(supabaseAdmin, audioBucket, objectPath, audioBuffer);
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
