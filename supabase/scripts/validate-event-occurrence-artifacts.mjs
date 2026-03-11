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
    horizonDays: Number(process.env.EVENT_PREWARM_HORIZON_DAYS ?? 540),
    strict: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg.startsWith("--horizon-days=")) {
      options.horizonDays = Number(arg.split("=", 2)[1]);
      continue;
    }
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
  headers = {},
  method = "GET",
  pathWithQuery,
  serviceRoleKey,
  supabaseUrl,
}) {
  const url = `${supabaseUrl}${pathWithQuery}`;
  const init = {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...headers,
    },
    method,
  };

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
        `/rest/v1/event_occurrence_content?select=id,occurrence_id,language,audio_status,has_word_timings,script_text,updated_at&language=eq.en&occurrence_id=in.(${inFilter})`,
      serviceRoleKey,
      supabaseUrl,
    });

    rows.push(...page);
  }

  return rows;
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
    `Validating event artifacts in horizon ${toIso(horizonStart)} -> ${toIso(horizonEnd)}.`,
  );

  const seriesRows = await fetchCanonicalGlobalSeries({
    serviceRoleKey,
    supabaseUrl,
  });
  const seriesIds = seriesRows
    .map((row) => (typeof row.id === "string" ? row.id : ""))
    .filter(Boolean);

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

  const contentRows = await fetchEventOccurrenceContentRows({
    occurrenceIds,
    serviceRoleKey,
    supabaseUrl,
  });

  const contentByOccurrenceId = new Map();
  for (const row of contentRows) {
    const occurrenceId = typeof row.occurrence_id === "string" ? row.occurrence_id : "";
    if (!occurrenceId) {
      continue;
    }

    contentByOccurrenceId.set(occurrenceId, {
      audioStatus: typeof row.audio_status === "string" ? row.audio_status : "missing",
      hasWordTimings: Boolean(row.has_word_timings),
      scriptText: typeof row.script_text === "string" ? row.script_text.trim() : "",
    });
  }

  const missingScriptOccurrenceIds = [];
  let scriptsReady = 0;
  let audioReady = 0;
  let missingAudio = 0;
  let missingTimings = 0;

  for (const occurrenceId of occurrenceIds) {
    const content = contentByOccurrenceId.get(occurrenceId);
    const hasScript = Boolean(content?.scriptText);
    if (!hasScript) {
      missingScriptOccurrenceIds.push(occurrenceId);
      continue;
    }

    scriptsReady += 1;

    if (content.audioStatus === "ready") {
      audioReady += 1;
      if (!content.hasWordTimings) {
        missingTimings += 1;
      }
      continue;
    }

    missingAudio += 1;
  }

  const summary = {
    audioReady,
    horizonDays: options.horizonDays,
    missingAudio,
    missingScript: missingScriptOccurrenceIds.length,
    missingScriptSample: missingScriptOccurrenceIds.slice(0, 20),
    missingTimings,
    scriptReady: scriptsReady,
    totalCanonicalOccurrences: occurrenceIds.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (
    options.strict &&
    (summary.missingScript > 0 || summary.missingAudio > 0 || summary.missingTimings > 0)
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Event artifact validation failed: ${message}`);
  process.exit(1);
});
