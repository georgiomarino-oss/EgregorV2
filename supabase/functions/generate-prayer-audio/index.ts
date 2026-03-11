import { createClient } from "npm:@supabase/supabase-js@2.58.0";

import { corsHeaders } from "../_shared/cors.ts";

interface PrayerAudioRequest {
  allowGeneration?: boolean;
  durationMinutes?: number;
  eventOccurrenceContentId?: string;
  language?: string;
  prayerLibraryItemId?: string;
  prayerLibraryScriptId?: string;
  script?: string;
  title?: string;
  voiceId?: string;
  voiceLabel?: string;
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

type ArtifactStatus = "failed" | "pending" | "ready";

interface PrayerAudioArtifactRow {
  cache_version: string;
  content_type: string;
  duration_minutes: number | null;
  generated_at: string;
  id: string;
  language: string;
  model_id: string;
  prayer_library_item_id: string | null;
  prayer_library_script_id: string | null;
  script_checksum: string;
  script_hash: string;
  status: ArtifactStatus;
  storage_object_path: string;
  timings_object_path: string;
  title: string | null;
  voice_id: string;
  voice_label: string | null;
  word_timings: unknown;
}

const DEFAULT_VOICE_ID = "V904i8ujLitGpMyoTznT";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_AUDIO_BUCKET = "prayer-audio";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_CONTENT_TYPE = "audio/mpeg";
const AUDIO_BUCKET_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_AUDIO_CACHE_VERSION = "v3-artifacts";
const PRAYER_AUDIO_ARTIFACT_SELECT =
  "id,voice_id,voice_label,model_id,cache_version,script_hash,script_checksum,storage_object_path,timings_object_path,content_type,word_timings,status,prayer_library_script_id,prayer_library_item_id,duration_minutes,language,title,generated_at";

type SupabaseAdminClient = ReturnType<typeof createClient>;

let ensureBucketPromise: Promise<void> | null = null;

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for audio storage.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAudioBucketName() {
  return (
    Deno.env.get("ELEVENLABS_AUDIO_BUCKET")?.trim() || DEFAULT_AUDIO_BUCKET
  );
}

function getSignedUrlTtlSeconds() {
  const raw = Deno.env.get("ELEVENLABS_AUDIO_SIGNED_URL_TTL_SECONDS")?.trim();
  if (!raw) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  return Math.floor(parsed);
}

function getAudioCacheVersion() {
  return (
    Deno.env.get("ELEVENLABS_AUDIO_CACHE_VERSION")?.trim() ||
    DEFAULT_AUDIO_CACHE_VERSION
  );
}

function normalizeScriptForCache(script: string) {
  return script.replace(/\s+/g, " ").trim();
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureAudioBucket(client: SupabaseAdminClient, bucket: string) {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data, error } = await client.storage.getBucket(bucket);
      if (!error && data) {
        const currentLimit =
          typeof (data as { file_size_limit?: number | null })
            .file_size_limit === "number"
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
        !/already exists|duplicate|conflict/i.test(createError.message || "")
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

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const row = error as { code?: string; message?: string };
  const message = row.message?.toLowerCase() ?? "";
  return (
    row.code === "42P01" ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

async function uploadAudioToStorage(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
  audioBytes: Uint8Array,
) {
  const { error } = await client.storage
    .from(bucket)
    .upload(objectPath, audioBytes, {
      contentType: DEFAULT_CONTENT_TYPE,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload generated audio: ${error.message}`);
  }
}

async function fetchArtifact(
  client: SupabaseAdminClient,
  input: {
    cacheVersion: string;
    modelId: string;
    scriptHash: string;
    voiceId: string;
  },
) {
  const { data, error } = await client
    .from("prayer_audio_artifacts")
    .select(PRAYER_AUDIO_ARTIFACT_SELECT)
    .eq("voice_id", input.voiceId)
    .eq("model_id", input.modelId)
    .eq("cache_version", input.cacheVersion)
    .eq("script_hash", input.scriptHash)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }

    throw new Error(`Failed to load prayer audio artifact: ${error.message}`);
  }

  return (data as PrayerAudioArtifactRow | null) ?? null;
}

async function fetchArtifactByLibraryContext(
  client: SupabaseAdminClient,
  input: {
    cacheVersion: string;
    durationMinutes: number | null;
    language: string;
    modelId: string;
    prayerLibraryItemId: string | null;
    prayerLibraryScriptId: string | null;
    voiceId: string;
  },
) {
  let query = client
    .from("prayer_audio_artifacts")
    .select(PRAYER_AUDIO_ARTIFACT_SELECT)
    .eq("voice_id", input.voiceId)
    .eq("model_id", input.modelId)
    .eq("cache_version", input.cacheVersion)
    .eq("status", "ready")
    .order("generated_at", { ascending: false })
    .limit(1);

  if (input.prayerLibraryScriptId) {
    query = query.eq("prayer_library_script_id", input.prayerLibraryScriptId);
  } else if (input.prayerLibraryItemId && input.durationMinutes) {
    query = query
      .eq("prayer_library_item_id", input.prayerLibraryItemId)
      .eq("duration_minutes", input.durationMinutes)
      .eq("language", input.language);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }

    throw new Error(
      `Failed to load prayer audio artifact by context: ${error.message}`,
    );
  }

  return (data as PrayerAudioArtifactRow | null) ?? null;
}

async function upsertArtifact(
  client: SupabaseAdminClient,
  input: {
    cacheVersion: string;
    contentType: string;
    durationMinutes: number | null;
    errorMessage: string | null;
    generatedAtIso: string;
    language: string;
    modelId: string;
    prayerLibraryItemId: string | null;
    prayerLibraryScriptId: string | null;
    scriptChecksum: string;
    scriptHash: string;
    status: ArtifactStatus;
    storageObjectPath: string;
    timingsObjectPath: string;
    title: string | null;
    voiceId: string;
    voiceLabel: string | null;
    wordTimings: TimedWord[];
  },
) {
  const payload = {
    cache_version: input.cacheVersion,
    content_type: input.contentType,
    duration_minutes: input.durationMinutes,
    error_message: input.errorMessage,
    generated_at: input.generatedAtIso,
    language: input.language,
    last_accessed_at: timezoneNowIso(),
    model_id: input.modelId,
    prayer_library_item_id: input.prayerLibraryItemId,
    prayer_library_script_id: input.prayerLibraryScriptId,
    script_checksum: input.scriptChecksum,
    script_hash: input.scriptHash,
    status: input.status,
    storage_object_path: input.storageObjectPath,
    timings_object_path: input.timingsObjectPath,
    title: input.title,
    voice_id: input.voiceId,
    voice_label: input.voiceLabel,
    word_timings: input.wordTimings,
  };

  const { data, error } = await client
    .from("prayer_audio_artifacts")
    .upsert(payload, {
      onConflict: "voice_id,model_id,cache_version,script_hash",
    })
    .select(PRAYER_AUDIO_ARTIFACT_SELECT)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }

    throw new Error(`Failed to upsert prayer audio artifact: ${error.message}`);
  }

  return (data as PrayerAudioArtifactRow | null) ?? null;
}

async function syncEventOccurrenceContentAudio(
  client: SupabaseAdminClient,
  input: {
    audioArtifactId: string | null;
    audioError: string | null;
    audioGeneratedAtIso: string | null;
    audioStatus: "failed" | "missing" | "pending" | "ready";
    eventOccurrenceContentId: string | null;
    hasWordTimings: boolean;
    voiceId: string;
    voiceLabel: string | null;
  },
) {
  const eventOccurrenceContentId = input.eventOccurrenceContentId?.trim() || "";
  if (!eventOccurrenceContentId) {
    return;
  }

  const { error } = await client
    .from("event_occurrence_content")
    .update({
      audio_artifact_id: input.audioArtifactId,
      audio_error: input.audioError,
      audio_generated_at: input.audioGeneratedAtIso,
      audio_status: input.audioStatus,
      has_word_timings: input.hasWordTimings,
      voice_id: input.voiceId,
      voice_label: input.voiceLabel,
    })
    .eq("id", eventOccurrenceContentId);

  if (error && !isMissingTableError(error)) {
    throw new Error(
      `Failed to update event occurrence content audio linkage: ${error.message}`,
    );
  }
}

function timezoneNowIso() {
  return new Date().toISOString();
}

function toPositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

async function uploadWordTimingsToStorage(
  client: SupabaseAdminClient,
  bucket: string,
  objectPath: string,
  wordTimings: TimedWord[],
) {
  const payload = new TextEncoder().encode(JSON.stringify(wordTimings));
  const { error } = await client.storage
    .from(bucket)
    .upload(objectPath, payload, {
      contentType: "application/json",
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
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const word = typeof row.word === "string" ? row.word.trim() : "";
      const startSeconds = Number(row.startSeconds);
      const endSeconds = Number(row.endSeconds);

      if (
        !word ||
        !Number.isFinite(startSeconds) ||
        !Number.isFinite(endSeconds)
      ) {
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
  const { data, error } = await client.storage
    .from(bucket)
    .download(objectPath);
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

function toWordTimingsFromAlignment(
  alignment: ElevenLabsAlignment | null | undefined,
): TimedWord[] {
  if (!alignment) {
    return [];
  }

  const characters = Array.isArray(alignment.characters)
    ? alignment.characters
    : [];
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
  let buffer = "";
  let wordStart = -1;
  let wordEnd = -1;

  const flushWord = () => {
    const value = buffer.trim();
    if (!value || wordStart < 0 || wordEnd < 0) {
      buffer = "";
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

    buffer = "";
    wordStart = -1;
    wordEnd = -1;
  };

  for (let index = 0; index < count; index += 1) {
    const character = characters[index] ?? "";
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
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const result: ElevenLabsVoiceSettings = {};

  if (typeof source.stability === "number") {
    result.stability = source.stability;
  }
  if (typeof source.similarity_boost === "number") {
    result.similarity_boost = source.similarity_boost;
  }
  if (typeof source.style === "number") {
    result.style = source.style;
  }
  if (typeof source.speed === "number") {
    result.speed = source.speed;
  }
  if (typeof source.use_speaker_boost === "boolean") {
    result.use_speaker_boost = source.use_speaker_boost;
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function fetchVoiceSettings(
  elevenLabsApiKey: string,
  voiceId: string,
): Promise<ElevenLabsVoiceSettings | null> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/voices/${voiceId}/settings`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "xi-api-key": elevenLabsApiKey,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return sanitizeVoiceSettings(payload);
}

Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    let payload: PrayerAudioRequest;

    try {
      payload = (await request.json()) as PrayerAudioRequest;
    } catch (_error) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const inputScript = payload.script?.trim() || "";
    if (!inputScript) {
      return new Response(JSON.stringify({ error: "script is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const script = normalizeScriptForCache(inputScript);
    if (!script) {
      return new Response(JSON.stringify({ error: "script is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const configuredDefaultVoiceId = Deno.env
      .get("ELEVENLABS_DEFAULT_VOICE_ID")
      ?.trim();
    const voiceId =
      payload.voiceId?.trim() || configuredDefaultVoiceId || DEFAULT_VOICE_ID;
    const voiceLabel = payload.voiceLabel?.trim() || null;
    const modelId =
      Deno.env.get("ELEVENLABS_MODEL_ID")?.trim() || DEFAULT_MODEL_ID;
    const cacheVersion = getAudioCacheVersion();
    const scriptHash = await sha256Hex(
      `${cacheVersion}|${voiceId}|${modelId}|${script}`,
    );
    const scriptChecksum = await sha256Hex(script);
    const audioBucket = getAudioBucketName();
    const signedUrlTtlSeconds = getSignedUrlTtlSeconds();
    const durationMinutes = toPositiveInteger(payload.durationMinutes);
    const language = payload.language?.trim() || "en";
    const allowGeneration = payload.allowGeneration === true;
    const eventOccurrenceContentId =
      payload.eventOccurrenceContentId?.trim() || null;
    const prayerLibraryScriptId = payload.prayerLibraryScriptId?.trim() || null;
    const prayerLibraryItemId = payload.prayerLibraryItemId?.trim() || null;
    const title = payload.title?.trim() || null;
    const defaultObjectPath = `${voiceId}/${modelId}/${scriptHash}.mp3`;
    const defaultTimingPath = `${voiceId}/${modelId}/${scriptHash}.timings.json`;
    const supabaseAdmin = getSupabaseAdminClient();

    await ensureAudioBucket(supabaseAdmin, audioBucket);

    let artifact = await fetchArtifactByLibraryContext(supabaseAdmin, {
      cacheVersion,
      durationMinutes,
      language,
      modelId,
      prayerLibraryItemId,
      prayerLibraryScriptId,
      voiceId,
    });

    if (!artifact) {
      artifact = await fetchArtifact(supabaseAdmin, {
        cacheVersion,
        modelId,
        scriptHash,
        voiceId,
      });
    }

    const objectPath = artifact?.storage_object_path || defaultObjectPath;
    const timingObjectPath = artifact?.timings_object_path || defaultTimingPath;

    const cachedAudioUrl = await createSignedAudioUrl(
      supabaseAdmin,
      audioBucket,
      objectPath,
      signedUrlTtlSeconds,
    );

    if (cachedAudioUrl) {
      const rowWordTimings = sanitizeWordTimings(artifact?.word_timings);
      const cachedWordTimings =
        rowWordTimings.length > 0
          ? rowWordTimings
          : await fetchStoredWordTimings(
              supabaseAdmin,
              audioBucket,
              timingObjectPath,
            );

      const readyArtifact = await upsertArtifact(supabaseAdmin, {
        cacheVersion,
        contentType: artifact?.content_type || DEFAULT_CONTENT_TYPE,
        durationMinutes: durationMinutes ?? artifact?.duration_minutes ?? null,
        errorMessage: null,
        generatedAtIso: artifact?.generated_at || timezoneNowIso(),
        language,
        modelId,
        prayerLibraryItemId:
          prayerLibraryItemId ?? artifact?.prayer_library_item_id ?? null,
        prayerLibraryScriptId:
          prayerLibraryScriptId ?? artifact?.prayer_library_script_id ?? null,
        scriptChecksum,
        scriptHash,
        status: "ready",
        storageObjectPath: objectPath,
        timingsObjectPath: timingObjectPath,
        title: title ?? artifact?.title ?? null,
        voiceId,
        voiceLabel: voiceLabel ?? artifact?.voice_label ?? null,
        wordTimings: cachedWordTimings,
      });
      await syncEventOccurrenceContentAudio(supabaseAdmin, {
        audioArtifactId: readyArtifact?.id ?? artifact?.id ?? null,
        audioError: null,
        audioGeneratedAtIso:
          readyArtifact?.generated_at ??
          artifact?.generated_at ??
          timezoneNowIso(),
        audioStatus: "ready",
        eventOccurrenceContentId,
        hasWordTimings: cachedWordTimings.length > 0,
        voiceId,
        voiceLabel: voiceLabel ?? artifact?.voice_label ?? null,
      });

      return new Response(
        JSON.stringify({
          audioUrl: cachedAudioUrl,
          contentType: artifact?.content_type || DEFAULT_CONTENT_TYPE,
          voiceId,
          wordTimings: cachedWordTimings,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    if (!allowGeneration) {
      await syncEventOccurrenceContentAudio(supabaseAdmin, {
        audioArtifactId: null,
        audioError:
          "No pre-generated audio artifact exists for this script and voice.",
        audioGeneratedAtIso: null,
        audioStatus: "missing",
        eventOccurrenceContentId,
        hasWordTimings: false,
        voiceId,
        voiceLabel,
      });

      return new Response(
        JSON.stringify({
          error: "Audio artifact not found",
          detail:
            "No pre-generated audio artifact exists for this script and voice. ElevenLabs generation is disabled for this request.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }

    const pendingArtifact = await upsertArtifact(supabaseAdmin, {
      cacheVersion,
      contentType: DEFAULT_CONTENT_TYPE,
      durationMinutes,
      errorMessage: null,
      generatedAtIso: timezoneNowIso(),
      language,
      modelId,
      prayerLibraryItemId,
      prayerLibraryScriptId,
      scriptChecksum,
      scriptHash,
      status: "pending",
      storageObjectPath: objectPath,
      timingsObjectPath: timingObjectPath,
      title,
      voiceId,
      voiceLabel,
      wordTimings: [],
    });
    await syncEventOccurrenceContentAudio(supabaseAdmin, {
      audioArtifactId: pendingArtifact?.id ?? artifact?.id ?? null,
      audioError: null,
      audioGeneratedAtIso: null,
      audioStatus: "pending",
      eventOccurrenceContentId,
      hasWordTimings: false,
      voiceId,
      voiceLabel,
    });

    const voiceSettings = await fetchVoiceSettings(elevenLabsApiKey, voiceId);
    const requestBody: Record<string, unknown> = {
      model_id: modelId,
      text: script,
    };

    if (voiceSettings) {
      requestBody.voice_settings = voiceSettings;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      const failedError = errorText.slice(0, 4000);

      const failedArtifact = await upsertArtifact(supabaseAdmin, {
        cacheVersion,
        contentType: DEFAULT_CONTENT_TYPE,
        durationMinutes,
        errorMessage: failedError,
        generatedAtIso: timezoneNowIso(),
        language,
        modelId,
        prayerLibraryItemId,
        prayerLibraryScriptId,
        scriptChecksum,
        scriptHash,
        status: "failed",
        storageObjectPath: objectPath,
        timingsObjectPath: timingObjectPath,
        title,
        voiceId,
        voiceLabel,
        wordTimings: [],
      });
      await syncEventOccurrenceContentAudio(supabaseAdmin, {
        audioArtifactId: failedArtifact?.id ?? pendingArtifact?.id ?? null,
        audioError: failedError,
        audioGeneratedAtIso: null,
        audioStatus: "failed",
        eventOccurrenceContentId,
        hasWordTimings: false,
        voiceId,
        voiceLabel,
      });

      return new Response(
        JSON.stringify({
          error: "ElevenLabs request failed",
          detail: errorText,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    const timestampPayload =
      (await response.json()) as ElevenLabsTimestampResponse;
    const audioBase64 = timestampPayload.audio_base64?.trim();

    if (!audioBase64) {
      const failedArtifact = await upsertArtifact(supabaseAdmin, {
        cacheVersion,
        contentType: DEFAULT_CONTENT_TYPE,
        durationMinutes,
        errorMessage: "ElevenLabs response missing audio data",
        generatedAtIso: timezoneNowIso(),
        language,
        modelId,
        prayerLibraryItemId,
        prayerLibraryScriptId,
        scriptChecksum,
        scriptHash,
        status: "failed",
        storageObjectPath: objectPath,
        timingsObjectPath: timingObjectPath,
        title,
        voiceId,
        voiceLabel,
        wordTimings: [],
      });
      await syncEventOccurrenceContentAudio(supabaseAdmin, {
        audioArtifactId: failedArtifact?.id ?? pendingArtifact?.id ?? null,
        audioError: "ElevenLabs response missing audio data",
        audioGeneratedAtIso: null,
        audioStatus: "failed",
        eventOccurrenceContentId,
        hasWordTimings: false,
        voiceId,
        voiceLabel,
      });

      return new Response(
        JSON.stringify({ error: "ElevenLabs response missing audio data" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    const audioBytes = decodeBase64ToUint8Array(audioBase64);
    const alignment =
      timestampPayload.normalized_alignment ?? timestampPayload.alignment;
    const wordTimings = toWordTimingsFromAlignment(alignment);

    await uploadAudioToStorage(
      supabaseAdmin,
      audioBucket,
      objectPath,
      audioBytes,
    );
    await uploadWordTimingsToStorage(
      supabaseAdmin,
      audioBucket,
      timingObjectPath,
      wordTimings,
    );

    const audioUrl = await createSignedAudioUrl(
      supabaseAdmin,
      audioBucket,
      objectPath,
      signedUrlTtlSeconds,
    );

    if (!audioUrl) {
      const failedArtifact = await upsertArtifact(supabaseAdmin, {
        cacheVersion,
        contentType: DEFAULT_CONTENT_TYPE,
        durationMinutes,
        errorMessage: "Failed to create signed audio URL after upload",
        generatedAtIso: timezoneNowIso(),
        language,
        modelId,
        prayerLibraryItemId,
        prayerLibraryScriptId,
        scriptChecksum,
        scriptHash,
        status: "failed",
        storageObjectPath: objectPath,
        timingsObjectPath: timingObjectPath,
        title,
        voiceId,
        voiceLabel,
        wordTimings,
      });
      await syncEventOccurrenceContentAudio(supabaseAdmin, {
        audioArtifactId: failedArtifact?.id ?? pendingArtifact?.id ?? null,
        audioError: "Failed to create signed audio URL after upload",
        audioGeneratedAtIso: null,
        audioStatus: "failed",
        eventOccurrenceContentId,
        hasWordTimings: wordTimings.length > 0,
        voiceId,
        voiceLabel,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to create signed audio URL after upload",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const readyGeneratedAtIso = timezoneNowIso();
    const readyArtifact = await upsertArtifact(supabaseAdmin, {
      cacheVersion,
      contentType: DEFAULT_CONTENT_TYPE,
      durationMinutes,
      errorMessage: null,
      generatedAtIso: readyGeneratedAtIso,
      language,
      modelId,
      prayerLibraryItemId,
      prayerLibraryScriptId,
      scriptChecksum,
      scriptHash,
      status: "ready",
      storageObjectPath: objectPath,
      timingsObjectPath: timingObjectPath,
      title,
      voiceId,
      voiceLabel,
      wordTimings,
    });
    await syncEventOccurrenceContentAudio(supabaseAdmin, {
      audioArtifactId: readyArtifact?.id ?? pendingArtifact?.id ?? null,
      audioError: null,
      audioGeneratedAtIso:
        readyArtifact?.generated_at ?? readyGeneratedAtIso,
      audioStatus: "ready",
      eventOccurrenceContentId,
      hasWordTimings: wordTimings.length > 0,
      voiceId,
      voiceLabel,
    });

    return new Response(
      JSON.stringify({
        audioUrl,
        contentType: DEFAULT_CONTENT_TYPE,
        voiceId,
        wordTimings,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown function error";
    return new Response(
      JSON.stringify({ error: "generate-prayer-audio failed", detail }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
