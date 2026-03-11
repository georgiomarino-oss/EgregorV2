import { corsHeaders } from "../_shared/cors.ts";

const DEFAULT_MODEL = "gpt-4.1-mini";
const SCRIPT_PROMPT_VERSION = "event-v1";
const HYPHEN_LIKE_PATTERN = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;
const SECTION_HEADING_PATTERN = /^(grounding|prayer|closing|opening|reflection)\s*:?$/i;

interface EventScriptRequest {
  force?: boolean;
  language?: string;
  model?: string;
  occurrenceId?: string;
}

type JsonObject = Record<string, unknown>;

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? "";
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

function getSupabaseBaseUrl() {
  return getRequiredEnv("SUPABASE_URL");
}

function getSupabaseServiceRoleKey() {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function getOpenAiApiKey() {
  return getRequiredEnv("OPENAI_API_KEY");
}

function supabaseHeaders() {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(pathWithQuery: string, init?: RequestInit) {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(`${baseUrl}${pathWithQuery}`, {
    ...init,
    headers: {
      ...supabaseHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(
      `Supabase request failed (${response.status} ${response.statusText}) ${pathWithQuery}: ${detail}`,
    );
  }

  return payload;
}

function normalizeSeriesRow(series: unknown): JsonObject | null {
  if (!series || typeof series !== "object") {
    return null;
  }

  if (Array.isArray(series)) {
    const first = series[0];
    return first && typeof first === "object"
      ? (first as JsonObject)
      : null;
  }

  return series as JsonObject;
}

function getString(record: JsonObject, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getNumber(record: JsonObject, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function getObject(record: JsonObject, key: string): JsonObject {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function getBoolean(record: JsonObject, key: string) {
  return Boolean(record[key]);
}

function computeDurationMinutes(startsAtIso: string, endsAtIso: string) {
  const startsAt = new Date(startsAtIso).getTime();
  const endsAt = new Date(endsAtIso).getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return null;
  }

  const minutes = Math.round((endsAt - startsAt) / 60000);
  return minutes > 0 ? minutes : null;
}

function sanitizeLineForSpeech(line: string): string {
  let cleaned = line.normalize("NFKC").replace(/\t/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  cleaned = cleaned.replace(/^#{1,6}\s+/, "");
  cleaned = cleaned.replace(/^(\*\*|__)+\s*/, "").replace(/\s*(\*\*|__)+$/, "");
  cleaned = cleaned.replace(/^([-*\u2022\u25CF\u25E6\u25AA\u25AB]|\d+[.)])\s+/, "");

  if (SECTION_HEADING_PATTERN.test(cleaned)) {
    return "";
  }

  cleaned = cleaned.replace(/[*_`~>|]/g, "");
  cleaned = cleaned.replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, "$1 and $2");
  cleaned = cleaned.replace(HYPHEN_LIKE_PATTERN, " ");
  cleaned = cleaned.replace(/\s*-\s*/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/\s+([,.;!?])/g, "$1");
  cleaned = cleaned.replace(/([,.;!?])\1+/g, "$1");

  return cleaned.trim();
}

function sanitizeScriptForSpeech(raw: string): string {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const cleaned = sanitizeLineForSpeech(line);
    if (!cleaned) {
      if (current.length > 0) {
        paragraphs.push(current.join(" ").trim());
        current = [];
      }
      continue;
    }
    current.push(cleaned);
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" ").trim());
  }

  return paragraphs
    .map((paragraph) => {
      const collapsed = paragraph.replace(/\s+/g, " ").trim();
      if (!collapsed) {
        return "";
      }
      return /[.?!]$/.test(collapsed) ? collapsed : `${collapsed}.`;
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function sentenceKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(HYPHEN_LIKE_PATTERN, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceSignatures(scriptText: string, maxCount = 2) {
  if (!scriptText.trim()) {
    return [] as string[];
  }

  const normalized = scriptText.replace(/\r\n/g, "\n");
  const matches = normalized.match(/[^.!?]+[.!?]?/g) ?? [];
  return matches
    .map((sentence) => sentenceKey(sentence))
    .filter((sentence) => sentence.length > 0)
    .slice(0, maxCount)
    .map((sentence) => sentence.split(/\s+/).slice(0, 14).join(" "));
}

function countWords(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(/\s+/).length;
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toUtcDateLabel(isoDate: string) {
  const millis = new Date(isoDate).getTime();
  if (!Number.isFinite(millis)) {
    return "unknown date";
  }

  return new Date(millis).toLocaleString("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

function resolveVoiceRecommendation(seriesMetadata: JsonObject) {
  const recommendation = seriesMetadata.voice_recommendation;
  if (!recommendation || typeof recommendation !== "object" || Array.isArray(recommendation)) {
    return { voiceId: null as string | null, voiceLabel: null as string | null };
  }

  const record = recommendation as JsonObject;
  const voiceId = getString(record, "voice_id").trim();
  const voiceLabel = getString(record, "voice_label").trim();
  return {
    voiceId: voiceId || null,
    voiceLabel: voiceLabel || null,
  };
}

function resolveScriptTheme(seriesMetadata: JsonObject) {
  const scriptTheme = getString(seriesMetadata, "script_theme").trim();
  return scriptTheme || "shared intention, grounded compassion, and collective coherence";
}

function parseLunarContext(occurrenceMetadata: JsonObject) {
  const lunarName = getString(occurrenceMetadata, "lunar_name").trim();
  const lunarPhase = getString(occurrenceMetadata, "lunar_phase").trim().toLowerCase();
  const hasLunarEclipse = getBoolean(occurrenceMetadata, "has_lunar_eclipse");
  const eclipseLabel = getString(occurrenceMetadata, "eclipse_label").trim();
  const isTotalLunarEclipse = hasLunarEclipse && /total/i.test(eclipseLabel);

  return {
    eclipseLabel: eclipseLabel || null,
    hasLunarEclipse,
    isTotalLunarEclipse,
    lunarName: lunarName || null,
    lunarPhase: lunarPhase || null,
  };
}

function extractResponseText(response: JsonObject) {
  const outputText = response.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText.trim();
  }

  const output = Array.isArray(response.output)
    ? response.output
    : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as JsonObject).content)
      ? ((item as JsonObject).content as unknown[])
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const record = part as JsonObject;
      const text = typeof record.text === "string" ? record.text.trim() : "";
      const outputPart = typeof record.output_text === "string"
        ? record.output_text.trim()
        : "";

      if (text) {
        chunks.push(text);
      } else if (outputPart) {
        chunks.push(outputPart);
      }
    }
  }

  return chunks.join("\n\n").trim();
}

async function createOpenAiResponse(input: {
  apiKey: string;
  maxOutputTokens: number;
  model: string;
  userPrompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [
        {
          role: "system",
          content:
            "You write exceptional guided scripts for spiritual live rooms. Produce original prose that sounds natural when read aloud. Keep sentence flow fluid, emotionally precise, and free of list formatting.",
        },
        {
          role: "user",
          content: input.userPrompt,
        },
      ],
      max_output_tokens: input.maxOutputTokens,
      model: input.model,
      temperature: 0.9,
    }),
  });

  const payload = (await response.json()) as JsonObject;
  if (!response.ok) {
    throw new Error(`OpenAI responses API request failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function toStatusCode(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("not found")) {
    return 404;
  }

  if (message.includes("invalid") || message.includes("required")) {
    return 400;
  }

  return 500;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const payload = (await request.json()) as EventScriptRequest;
    const occurrenceId = payload.occurrenceId?.trim() || "";
    if (!occurrenceId) {
      throw new Error("occurrenceId is required");
    }

    const force = payload.force === true;
    const language = payload.language?.trim().toLowerCase() || "en";
    const model = payload.model?.trim() || DEFAULT_MODEL;

    const occurrenceRows = (await supabaseRequest(
      `/rest/v1/event_occurrences?select=id,series_id,starts_at_utc,ends_at_utc,metadata,series:event_series!inner(key,name,subtitle,description,purpose,category,metadata,default_duration_minutes)&id=eq.${encodeURIComponent(occurrenceId)}&limit=1`,
    )) as unknown[];

    if (!Array.isArray(occurrenceRows) || occurrenceRows.length === 0) {
      throw new Error("Event occurrence not found.");
    }

    const occurrence = occurrenceRows[0] as JsonObject;
    const series = normalizeSeriesRow(occurrence.series);
    if (!series) {
      throw new Error("Event series metadata not found for this occurrence.");
    }

    const existingRows = (await supabaseRequest(
      `/rest/v1/event_occurrence_content?select=id,occurrence_id,series_id,language,duration_minutes,script_text,script_hash,script_checksum,script_word_count,script_model,script_tone,script_prompt_version,source,voice_id,voice_label,audio_artifact_id,audio_status,audio_error,audio_generated_at,has_word_timings,metadata&occurrence_id=eq.${encodeURIComponent(occurrenceId)}&language=eq.${encodeURIComponent(language)}&limit=1`,
    )) as unknown[];

    const existing = Array.isArray(existingRows) && existingRows.length > 0
      ? (existingRows[0] as JsonObject)
      : null;

    if (existing && getString(existing, "script_text").trim() && !force) {
      return new Response(
        JSON.stringify({
          audioStatus: getString(existing, "audio_status") || "missing",
          contentId: getString(existing, "id"),
          durationMinutes: getNumber(existing, "duration_minutes"),
          generated: false,
          language,
          occurrenceId,
          reused: true,
          scriptText: getString(existing, "script_text"),
          voiceId: getString(existing, "voice_id") || null,
          voiceLabel: getString(existing, "voice_label") || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const occurrenceDuration = computeDurationMinutes(
      getString(occurrence, "starts_at_utc"),
      getString(occurrence, "ends_at_utc"),
    );
    const seriesDefaultDuration = getNumber(series, "default_duration_minutes");
    const targetDurationMinutes = Math.max(
      3,
      Math.min(45, Math.round(occurrenceDuration ?? seriesDefaultDuration ?? 15)),
    );
    const targetWords = Math.max(220, Math.round(targetDurationMinutes * 60));
    const minWords = Math.max(160, Math.round(targetDurationMinutes * 40));
    const maxWords = Math.max(minWords + 120, Math.round(targetDurationMinutes * 85));
    const seriesMetadata = getObject(series, "metadata");
    const occurrenceMetadata = getObject(occurrence, "metadata");
    const scriptTheme = resolveScriptTheme(seriesMetadata);
    const voiceRecommendation = resolveVoiceRecommendation(seriesMetadata);
    const lunarContext = parseLunarContext(occurrenceMetadata);
    const startsAtLabel = toUtcDateLabel(getString(occurrence, "starts_at_utc"));

    const recentScriptRows = (await supabaseRequest(
      `/rest/v1/event_occurrence_content?select=script_text&language=eq.${encodeURIComponent(language)}&occurrence_id=neq.${encodeURIComponent(occurrenceId)}&order=updated_at.desc&limit=80`,
    )) as unknown[];

    const forbiddenOpenings = new Set<string>();
    for (const row of recentScriptRows) {
      if (!row || typeof row !== "object") {
        continue;
      }

      const scriptText = getString(row as JsonObject, "script_text");
      for (const signature of sentenceSignatures(scriptText, 2)) {
        forbiddenOpenings.add(signature);
      }
    }

    const forbiddenOpeningHints = Array.from(forbiddenOpenings).slice(0, 18);

    const lunarHints: string[] = [];
    if (lunarContext.lunarName) {
      lunarHints.push(`Lunar name for this occurrence: ${lunarContext.lunarName}.`);
    }
    if (lunarContext.lunarPhase) {
      lunarHints.push(`Lunar phase key: ${lunarContext.lunarPhase}.`);
    }
    if (lunarContext.hasLunarEclipse) {
      lunarHints.push(
        `A lunar eclipse is associated with this occurrence (${lunarContext.eclipseLabel ?? "lunar eclipse"}).`,
      );
      if (lunarContext.isTotalLunarEclipse) {
        lunarHints.push(
          "You may use the phrase Blood Moon, because this is a real total lunar eclipse context.",
        );
      } else {
        lunarHints.push(
          "Do not use the phrase Blood Moon unless total lunar eclipse context is explicitly true.",
        );
      }
    } else {
      lunarHints.push("Do not use Blood Moon phrasing for this occurrence.");
    }

    const userPrompt = [
      `Create a unique guided script for this recurring spiritual live room: ${getString(series, "name")}.`,
      `Category: ${getString(series, "category") || "Collective"}.`,
      `Series key: ${getString(series, "key")}.`,
      `Series subtitle: ${getString(series, "subtitle") || "n/a"}.`,
      `Series purpose: ${getString(series, "purpose") || "n/a"}.`,
      `Series description: ${getString(series, "description") || "n/a"}.`,
      `Event start in UTC: ${startsAtLabel}.`,
      `Target spoken duration: ${targetDurationMinutes} minutes.`,
      `Target word count: about ${targetWords} words.`,
      `Hard word-count range: ${minWords} to ${maxWords} words.`,
      `Theme guidance: ${scriptTheme}.`,
      "Output requirements:",
      "1. Use calm, fluent, human-sounding spoken prose suitable for premium ElevenLabs narration.",
      "2. Use paragraph structure with natural cadence, punctuation, and pacing for on-screen following.",
      "3. Do not use markdown, bullets, numbering, labels, or robotic enumerations.",
      "4. Keep language inclusive, spiritually grounded, and globally accessible.",
      "5. Keep the script distinct from prior events and avoid repeated openings.",
      "6. Return only final spoken script text.",
      ...lunarHints,
      "Forbidden opening signatures to avoid:",
      forbiddenOpeningHints.length > 0
        ? forbiddenOpeningHints.map((value, index) => `${index + 1}. ${value}`).join("\n")
        : "None.",
    ].join("\n");

    const openAiApiKey = getOpenAiApiKey();
    const maxOutputTokens = Math.max(1200, Math.round(maxWords * 1.8));
    let scriptText = "";
    let scriptWordCount = 0;
    let lastWordCount = 0;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const revisionPrompt = attempt === 1
        ? userPrompt
        : `${userPrompt}\n\nRevision required: previous draft had ${lastWordCount} words. Regenerate to stay within ${minWords}-${maxWords} words while keeping natural spoken pacing and the same spiritual theme.`;

      const openAiResponse = await createOpenAiResponse({
        apiKey: openAiApiKey,
        maxOutputTokens,
        model,
        userPrompt: revisionPrompt,
      });

      const rawScript = extractResponseText(openAiResponse);
      if (!rawScript) {
        continue;
      }

      const sanitized = sanitizeScriptForSpeech(rawScript);
      if (!sanitized) {
        continue;
      }

      const words = countWords(sanitized);
      scriptText = sanitized;
      scriptWordCount = words;
      lastWordCount = words;

      if (words >= minWords && words <= maxWords) {
        break;
      }
    }

    if (!scriptText) {
      throw new Error("OpenAI output was empty after sanitization.");
    }

    const hardMinimum = Math.round(minWords * 0.9);
    const hardMaximum = Math.round(maxWords * 1.25);
    if (scriptWordCount < hardMinimum || scriptWordCount > hardMaximum) {
      throw new Error(
        `Generated script length ${scriptWordCount} words is outside acceptable range (${hardMinimum}-${hardMaximum}).`,
      );
    }

    const scriptHash = await sha256Hex(`${SCRIPT_PROMPT_VERSION}|${language}|${scriptText}`);
    const scriptChecksum = await sha256Hex(scriptText);
    const existingChecksum = existing ? getString(existing, "script_checksum").trim() : "";
    const isScriptChanged = existingChecksum !== scriptChecksum;

    const metadataPatch: JsonObject = {
      generated_by: "generate-event-occurrence-script",
      generated_prompt_version: SCRIPT_PROMPT_VERSION,
      generated_starts_at_utc: getString(occurrence, "starts_at_utc"),
      series_key: getString(series, "key"),
    };

    if (lunarContext.lunarName) {
      metadataPatch.lunar_name = lunarContext.lunarName;
    }
    if (lunarContext.lunarPhase) {
      metadataPatch.lunar_phase = lunarContext.lunarPhase;
    }
    if (lunarContext.hasLunarEclipse) {
      metadataPatch.has_lunar_eclipse = true;
      metadataPatch.eclipse_label = lunarContext.eclipseLabel;
    }

    const existingMetadata = existing ? getObject(existing, "metadata") : {};

    const upsertPayload: JsonObject = {
      occurrence_id: occurrenceId,
      series_id: getString(occurrence, "series_id"),
      language,
      duration_minutes: targetDurationMinutes,
      script_text: scriptText,
      script_hash: scriptHash,
      script_checksum: scriptChecksum,
      script_word_count: scriptWordCount,
      script_model: model,
      script_tone: scriptTheme,
      script_prompt_version: SCRIPT_PROMPT_VERSION,
      source: "openai",
      voice_id: voiceRecommendation.voiceId,
      voice_label: voiceRecommendation.voiceLabel,
      metadata: {
        ...existingMetadata,
        ...metadataPatch,
      },
    };

    if (!existing || isScriptChanged) {
      upsertPayload.audio_artifact_id = null;
      upsertPayload.audio_error = null;
      upsertPayload.audio_generated_at = null;
      upsertPayload.audio_status = "missing";
      upsertPayload.has_word_timings = false;
    }

    const upsertRows = (await supabaseRequest(
      "/rest/v1/event_occurrence_content?on_conflict=occurrence_id,language&select=id,occurrence_id,series_id,language,duration_minutes,script_text,script_hash,script_checksum,script_word_count,script_model,script_tone,script_prompt_version,source,voice_id,voice_label,audio_status",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify([upsertPayload]),
      },
    )) as unknown[];

    if (!Array.isArray(upsertRows) || upsertRows.length === 0) {
      throw new Error("Failed to persist event occurrence content.");
    }

    const saved = upsertRows[0] as JsonObject;

    return new Response(
      JSON.stringify({
        audioStatus: getString(saved, "audio_status") || "missing",
        contentId: getString(saved, "id"),
        durationMinutes: getNumber(saved, "duration_minutes"),
        generated: true,
        language,
        occurrenceId,
        reused: false,
        scriptText: getString(saved, "script_text"),
        voiceId: getString(saved, "voice_id") || null,
        voiceLabel: getString(saved, "voice_label") || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown function error";
    return new Response(
      JSON.stringify({
        detail,
        error: "generate-event-occurrence-script failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: toStatusCode(error),
      },
    );
  }
});
