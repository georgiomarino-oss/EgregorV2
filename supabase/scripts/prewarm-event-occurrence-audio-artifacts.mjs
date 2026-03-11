#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_VOICE_ID = "V904i8ujLitGpMyoTznT";
const DEFAULT_VOICE_LABEL = "Dominic";
const PAGE_SIZE = 500;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getProjectRef(rootDir) {
  const refPath = path.join(rootDir, "supabase", ".temp", "project-ref");
  if (!fs.existsSync(refPath)) {
    throw new Error("Missing supabase/.temp/project-ref. Run `supabase link` first.");
  }

  const projectRef = fs.readFileSync(refPath, "utf8").trim();
  if (!projectRef) {
    throw new Error("project-ref file is empty.");
  }

  return projectRef;
}

function getServiceRoleKey(projectRef, env) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    return env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const raw = execSync(`supabase projects api-keys --project-ref ${projectRef}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const serviceRoleMatch = raw.match(/^\s*service_role\s*\|\s*(.+?)\s*$/m);
  if (!serviceRoleMatch?.[1]) {
    throw new Error(
      "Could not resolve service_role key from Supabase CLI. Set SUPABASE_SERVICE_ROLE_KEY env var and rerun.",
    );
  }

  return serviceRoleMatch[1].trim();
}

function parseVoices(input) {
  if (!input?.trim()) {
    return [];
  }

  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [left, right] = part.includes(":")
        ? part.split(":", 2)
        : [part, part];
      const label = (left || "").trim();
      const id = (right || "").trim();
      if (!id) {
        return null;
      }

      return {
        id,
        label: label || id,
      };
    })
    .filter((entry) => entry !== null);
}

function parseArgs(argv, env) {
  const options = {
    allowGeneration: null,
    concurrency: Number(process.env.PREWARM_CONCURRENCY ?? 2),
    dryRun: false,
    force: false,
    horizonDays: Number(process.env.EVENT_PREWARM_HORIZON_DAYS ?? 540),
    limit: null,
    voicesRaw:
      process.env.ELEVENLABS_PREWARM_VOICE_IDS ?? env.ELEVENLABS_PREWARM_VOICE_IDS ?? "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--allow-generation") {
      options.allowGeneration = true;
      continue;
    }

    if (arg === "--artifact-only") {
      options.allowGeneration = false;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.split("=", 2)[1]);
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      options.concurrency = Number(arg.split("=", 2)[1]);
      continue;
    }

    if (arg.startsWith("--horizon-days=")) {
      options.horizonDays = Number(arg.split("=", 2)[1]);
      continue;
    }

    if (arg.startsWith("--voices=")) {
      options.voicesRaw = arg.split("=", 2)[1] ?? "";
      continue;
    }
  }

  if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) {
    options.concurrency = 2;
  }

  if (
    options.limit !== null &&
    (!Number.isFinite(options.limit) || options.limit <= 0)
  ) {
    options.limit = null;
  }

  if (!Number.isFinite(options.horizonDays) || options.horizonDays < 1) {
    options.horizonDays = 540;
  }

  const hasElevenLabsKey = Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() || env.ELEVENLABS_API_KEY?.trim(),
  );
  if (options.allowGeneration === null) {
    options.allowGeneration = hasElevenLabsKey;
  }

  return {
    ...options,
    hasElevenLabsKey,
    parsedVoices: parseVoices(options.voicesRaw),
  };
}

async function requestJsonWithStatus(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    data,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  };
}

async function requestJson(url, init) {
  const response = await requestJsonWithStatus(url, init);
  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}) for ${url}: ${typeof response.data === "string" ? response.data : JSON.stringify(response.data)}`,
    );
  }
  return response.data;
}

async function supabaseRestRequest({
  body,
  headers = {},
  method = "GET",
  pathWithQuery,
  serviceRoleKey,
  supabaseUrl,
}) {
  const url = `${supabaseUrl}${pathWithQuery}`;
  const baseHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...headers,
  };

  const init = {
    headers: baseHeaders,
    method,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }

  return requestJson(url, init);
}

function toIso(value) {
  return value.toISOString();
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function quoteInFilterValues(values) {
  return values.map((value) => `"${value}"`).join(",");
}

async function fetchCanonicalGlobalSeries({ serviceRoleKey, supabaseUrl }) {
  return supabaseRestRequest({
    pathWithQuery:
      "/rest/v1/event_series?select=id,key,name,is_active,visibility_scope,created_by&is_active=eq.true&visibility_scope=eq.global&created_by=is.null",
    serviceRoleKey,
    supabaseUrl,
  });
}

async function fetchOccurrencesForSeries({
  horizonEndIso,
  horizonStartIso,
  seriesIds,
  serviceRoleKey,
  supabaseUrl,
}) {
  const rows = [];

  for (const seriesIdChunk of chunk(seriesIds, 50)) {
    let offset = 0;
    const inFilter = quoteInFilterValues(seriesIdChunk);

    while (true) {
      const page = await supabaseRestRequest({
        pathWithQuery:
          `/rest/v1/event_occurrences?select=id,series_id,starts_at_utc,status&series_id=in.(${inFilter})&starts_at_utc=gte.${encodeURIComponent(horizonStartIso)}&starts_at_utc=lte.${encodeURIComponent(horizonEndIso)}&order=starts_at_utc.asc&limit=${PAGE_SIZE}&offset=${offset}`,
        serviceRoleKey,
        supabaseUrl,
      });

      if (!Array.isArray(page) || page.length === 0) {
        break;
      }

      rows.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }
  }

  return rows;
}

async function fetchEventOccurrenceContentRows({
  occurrenceIds,
  serviceRoleKey,
  supabaseUrl,
}) {
  const rows = [];

  for (const occurrenceIdChunk of chunk(occurrenceIds, 50)) {
    const inFilter = quoteInFilterValues(occurrenceIdChunk);
    const page = await supabaseRestRequest({
      pathWithQuery:
        `/rest/v1/event_occurrence_content?select=id,occurrence_id,series_id,language,duration_minutes,script_text,voice_id,voice_label,audio_status,has_word_timings,updated_at&language=eq.en&occurrence_id=in.(${inFilter})`,
      serviceRoleKey,
      supabaseUrl,
    });

    rows.push(...page);
  }

  return rows;
}

async function invokeGeneratePrayerAudio({
  allowGeneration,
  eventOccurrenceContentId,
  scriptText,
  durationMinutes,
  title,
  voice,
  serviceRoleKey,
  supabaseUrl,
}) {
  return requestJsonWithStatus(`${supabaseUrl}/functions/v1/generate-prayer-audio`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      allowGeneration,
      durationMinutes,
      eventOccurrenceContentId,
      language: "en",
      script: scriptText,
      title,
      voiceId: voice.id,
      voiceLabel: voice.label,
    }),
  });
}

async function runWithConcurrency(items, concurrency, worker) {
  if (items.length === 0) {
    return;
  }

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;

        if (index >= items.length) {
          break;
        }

        // eslint-disable-next-line no-await-in-loop
        await worker(items[index], index);
      }
    },
  );

  await Promise.all(workers);
}

async function main() {
  const rootDir = path.resolve(path.dirname(process.argv[1]), "..", "..");
  const env = {
    ...readEnvFile(path.join(rootDir, "supabase", ".env")),
    ...readEnvFile(path.join(rootDir, "supabase", "functions", ".env")),
  };
  const options = parseArgs(process.argv, env);

  const projectRef = getProjectRef(rootDir);
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const serviceRoleKey = getServiceRoleKey(projectRef, env);

  const horizonStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const horizonEnd = new Date(
    Date.now() + options.horizonDays * 24 * 60 * 60 * 1000,
  );

  console.log(`Using project ${projectRef}.`);
  console.log(
    `Event audio prewarm horizon: ${toIso(horizonStart)} -> ${toIso(horizonEnd)} (force=${options.force}, allowGeneration=${options.allowGeneration}).`,
  );
  if (!options.hasElevenLabsKey && options.allowGeneration) {
    console.log(
      "ELEVENLABS_API_KEY is not available in local env files; generation attempts may fail on remote function configuration.",
    );
  }

  const seriesRows = await fetchCanonicalGlobalSeries({
    serviceRoleKey,
    supabaseUrl,
  });
  const seriesById = new Map(
    seriesRows
      .map((row) => [
        typeof row.id === "string" ? row.id : "",
        {
          key: typeof row.key === "string" ? row.key : "",
          name: typeof row.name === "string" ? row.name : "Live Room",
        },
      ])
      .filter((entry) => entry[0]),
  );
  const seriesIds = Array.from(seriesById.keys());

  if (seriesIds.length === 0) {
    console.log("No active canonical global event series found.");
    return;
  }

  const occurrences = await fetchOccurrencesForSeries({
    horizonEndIso: toIso(horizonEnd),
    horizonStartIso: toIso(horizonStart),
    seriesIds,
    serviceRoleKey,
    supabaseUrl,
  });

  const occurrenceIds = occurrences
    .map((row) => (typeof row.id === "string" ? row.id : ""))
    .filter(Boolean);

  if (occurrenceIds.length === 0) {
    console.log("No canonical occurrences found in horizon.");
    return;
  }

  const contentRows = await fetchEventOccurrenceContentRows({
    occurrenceIds,
    serviceRoleKey,
    supabaseUrl,
  });

  const normalizedRows = contentRows
    .map((row) => ({
      audioStatus: typeof row.audio_status === "string" ? row.audio_status : "missing",
      contentId: typeof row.id === "string" ? row.id : "",
      durationMinutes: Number(row.duration_minutes ?? 0) || 0,
      hasWordTimings: Boolean(row.has_word_timings),
      occurrenceId: typeof row.occurrence_id === "string" ? row.occurrence_id : "",
      scriptText:
        typeof row.script_text === "string" ? row.script_text.trim() : "",
      seriesId: typeof row.series_id === "string" ? row.series_id : "",
      voiceId: typeof row.voice_id === "string" ? row.voice_id.trim() : "",
      voiceLabel: typeof row.voice_label === "string" ? row.voice_label.trim() : "",
    }))
    .filter((row) => row.contentId && row.occurrenceId && row.scriptText);

  const baseJobs = normalizedRows.filter((row) => {
    if (options.force) {
      return true;
    }

    return !(row.audioStatus === "ready" && row.hasWordTimings);
  });

  const jobs = [];
  for (const row of baseJobs) {
    const series = seriesById.get(row.seriesId);
    const fallbackVoice = {
      id: row.voiceId || DEFAULT_VOICE_ID,
      label: row.voiceLabel || DEFAULT_VOICE_LABEL,
    };
    const title = series?.name || "Live Room";

    if (options.parsedVoices.length > 0) {
      for (const voice of options.parsedVoices) {
        jobs.push({
          ...row,
          title,
          voice,
        });
      }
      continue;
    }

    jobs.push({
      ...row,
      title,
      voice: fallbackVoice,
    });
  }

  const limitedJobs =
    options.limit && options.limit > 0 ? jobs.slice(0, options.limit) : jobs;

  console.log(
    `${options.dryRun ? "Planned" : "Starting"} event audio prewarm for ${limitedJobs.length} jobs (${baseJobs.length} content rows).`,
  );

  if (options.dryRun) {
    limitedJobs.slice(0, 30).forEach((job, index) => {
      console.log(
        `[dry-run ${index + 1}] ${job.contentId} (${job.voice.label}:${job.voice.id})`,
      );
    });
    if (limitedJobs.length > 30) {
      console.log(`...and ${limitedJobs.length - 30} more`);
    }
    return;
  }

  let successCount = 0;
  let missingArtifactCount = 0;
  let failureCount = 0;

  await runWithConcurrency(limitedJobs, options.concurrency, async (job, index) => {
    const result = await invokeGeneratePrayerAudio({
      allowGeneration: options.allowGeneration,
      durationMinutes: job.durationMinutes > 0 ? job.durationMinutes : undefined,
      eventOccurrenceContentId: job.contentId,
      scriptText: job.scriptText,
      serviceRoleKey,
      supabaseUrl,
      title: job.title,
      voice: job.voice,
    });

    if (result.ok) {
      successCount += 1;
      console.log(
        `[${index + 1}/${limitedJobs.length}] OK ${job.contentId} -> ${job.voice.label}`,
      );
      return;
    }

    const payload =
      result.data && typeof result.data === "object" ? result.data : null;
    const detail =
      payload && typeof payload.detail === "string"
        ? payload.detail
        : typeof payload?.error === "string"
          ? payload.error
          : typeof result.data === "string"
            ? result.data
            : JSON.stringify(result.data);

    if (
      !options.allowGeneration &&
      result.status < 500 &&
      /(Audio artifact not found|No pre-generated audio artifact exists)/i.test(
        detail,
      )
    ) {
      missingArtifactCount += 1;
      console.log(
        `[${index + 1}/${limitedJobs.length}] MISS ${job.contentId} -> ${job.voice.label}`,
      );
      return;
    }

    failureCount += 1;
    console.error(
      `[${index + 1}/${limitedJobs.length}] FAIL ${job.contentId} -> ${job.voice.label}: ${detail}`,
    );
  });

  console.log(
    `Event audio prewarm complete. Success: ${successCount}. Missing artifacts (artifact-only mode): ${missingArtifactCount}. Failed: ${failureCount}.`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Event audio prewarm failed: ${message}`);
  process.exit(1);
});
