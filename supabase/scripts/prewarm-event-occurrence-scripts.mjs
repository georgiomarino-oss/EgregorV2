#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

function parseArgs(argv) {
  const options = {
    concurrency: Number(process.env.PREWARM_CONCURRENCY ?? 2),
    dryRun: false,
    force: false,
    horizonDays: Number(process.env.EVENT_PREWARM_HORIZON_DAYS ?? 540),
    limit: null,
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

  return options;
}

async function requestJson(url, init) {
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

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}) for ${url}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }

  return data;
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

async function fetchExistingEventContent({ occurrenceIds, serviceRoleKey, supabaseUrl }) {
  const existingByOccurrenceId = new Map();

  for (const chunkIds of chunk(occurrenceIds, 50)) {
    const inFilter = quoteInFilterValues(chunkIds);
    const rows = await supabaseRestRequest({
      pathWithQuery:
        `/rest/v1/event_occurrence_content?select=id,occurrence_id,script_text,audio_status,updated_at&language=eq.en&occurrence_id=in.(${inFilter})`,
      serviceRoleKey,
      supabaseUrl,
    });

    for (const row of rows) {
      const occurrenceId = typeof row.occurrence_id === "string" ? row.occurrence_id : "";
      if (!occurrenceId) {
        continue;
      }
      existingByOccurrenceId.set(occurrenceId, row);
    }
  }

  return existingByOccurrenceId;
}

async function invokeGenerateEventScript({
  force,
  occurrenceId,
  serviceRoleKey,
  supabaseUrl,
}) {
  return requestJson(`${supabaseUrl}/functions/v1/generate-event-occurrence-script`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      force,
      language: "en",
      occurrenceId,
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
  const options = parseArgs(process.argv);
  const rootDir = path.resolve(path.dirname(process.argv[1]), "..", "..");
  const env = {
    ...readEnvFile(path.join(rootDir, "supabase", ".env")),
    ...readEnvFile(path.join(rootDir, "supabase", "functions", ".env")),
  };

  const projectRef = getProjectRef(rootDir);
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const serviceRoleKey = getServiceRoleKey(projectRef, env);

  const horizonStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const horizonEnd = new Date(
    Date.now() + options.horizonDays * 24 * 60 * 60 * 1000,
  );

  console.log(`Using project ${projectRef}.`);
  console.log(
    `Event script prewarm horizon: ${toIso(horizonStart)} -> ${toIso(horizonEnd)} (force=${options.force}).`,
  );

  const seriesRows = await fetchCanonicalGlobalSeries({
    serviceRoleKey,
    supabaseUrl,
  });
  const seriesIds = seriesRows
    .map((row) => (typeof row.id === "string" ? row.id : ""))
    .filter(Boolean);

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

  const normalizedOccurrences = occurrences
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      seriesId: typeof row.series_id === "string" ? row.series_id : "",
      startsAtUtc: typeof row.starts_at_utc === "string" ? row.starts_at_utc : "",
      status: typeof row.status === "string" ? row.status : "",
    }))
    .filter((row) => row.id && row.seriesId && row.startsAtUtc);

  const existingByOccurrenceId = await fetchExistingEventContent({
    occurrenceIds: normalizedOccurrences.map((row) => row.id),
    serviceRoleKey,
    supabaseUrl,
  });

  const scriptJobs = normalizedOccurrences.filter((occurrence) => {
    if (options.force) {
      return true;
    }

    const existing = existingByOccurrenceId.get(occurrence.id);
    const scriptText =
      existing && typeof existing.script_text === "string"
        ? existing.script_text.trim()
        : "";

    return scriptText.length === 0;
  });

  const limitedJobs =
    options.limit && options.limit > 0 ? scriptJobs.slice(0, options.limit) : scriptJobs;

  console.log(
    `${options.dryRun ? "Planned" : "Starting"} event script prewarm for ${limitedJobs.length} occurrences (${normalizedOccurrences.length} in horizon).`,
  );

  if (options.dryRun) {
    limitedJobs.slice(0, 30).forEach((job, index) => {
      console.log(
        `[dry-run ${index + 1}] ${job.id} (${job.startsAtUtc}, ${job.status})`,
      );
    });
    if (limitedJobs.length > 30) {
      console.log(`...and ${limitedJobs.length - 30} more`);
    }
    return;
  }

  let successCount = 0;
  let generatedCount = 0;
  let reusedCount = 0;
  let failureCount = 0;

  await runWithConcurrency(limitedJobs, options.concurrency, async (job, index) => {
    try {
      const response = await invokeGenerateEventScript({
        force: options.force,
        occurrenceId: job.id,
        serviceRoleKey,
        supabaseUrl,
      });

      successCount += 1;
      if (response?.generated) {
        generatedCount += 1;
      } else {
        reusedCount += 1;
      }

      console.log(
        `[${index + 1}/${limitedJobs.length}] OK ${job.id} -> ${response?.generated ? "generated" : "reused"}`,
      );
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[${index + 1}/${limitedJobs.length}] FAIL ${job.id}: ${message}`,
      );
    }
  });

  console.log(
    `Event script prewarm complete. Success: ${successCount}. Generated: ${generatedCount}. Reused: ${reusedCount}. Failed: ${failureCount}.`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Event script prewarm failed: ${message}`);
  process.exit(1);
});
