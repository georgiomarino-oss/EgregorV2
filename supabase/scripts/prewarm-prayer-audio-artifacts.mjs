#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_VOICE_MAP = [
  { id: "V904i8ujLitGpMyoTznT", label: "Dominic" },
  { id: "jfIS2w2yJi0grJZPyEsk", label: "Oliver" },
  { id: "BFvr34n3gOoz0BAf9Rwn", label: "Amaya" },
  { id: "bgU7lBMo69PNEOWHFqxM", label: "Rainbird" },
];
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
    throw new Error(
      "Missing supabase/.temp/project-ref. Run `supabase link` first.",
    );
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

  const raw = execSync(
    `supabase projects api-keys --project-ref ${projectRef}`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

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
    return DEFAULT_VOICE_MAP;
  }

  const parsed = input
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

  return parsed.length > 0 ? parsed : DEFAULT_VOICE_MAP;
}

function parseArgs(argv) {
  const options = {
    concurrency: Number(process.env.PREWARM_CONCURRENCY ?? 2),
    dryRun: false,
    limit: null,
    voicesRaw: process.env.ELEVENLABS_PREWARM_VOICE_IDS ?? "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
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

async function fetchPublicPrayerItems({ serviceRoleKey, supabaseUrl }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRestRequest({
      pathWithQuery: `/rest/v1/prayer_library_items?select=id,title,is_public&is_public=eq.true&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`,
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

  return rows;
}

async function fetchPrayerScripts({ serviceRoleKey, supabaseUrl }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRestRequest({
      pathWithQuery: `/rest/v1/prayer_library_scripts?select=id,prayer_library_item_id,duration_minutes,language,script_text&order=updated_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
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

  return rows;
}

async function runWithConcurrency(items, concurrency, worker) {
  if (items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
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
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function invokeGeneratePrayerAudio({ job, serviceRoleKey, supabaseUrl }) {
  const response = await requestJson(
    `${supabaseUrl}/functions/v1/generate-prayer-audio`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowGeneration: true,
        durationMinutes: job.durationMinutes,
        language: job.language,
        prayerLibraryItemId: job.prayerLibraryItemId,
        prayerLibraryScriptId: job.prayerLibraryScriptId,
        script: job.scriptText,
        title: job.title,
        voiceId: job.voice.id,
        voiceLabel: job.voice.label,
      }),
    },
  );

  return response;
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
  const voices = parseVoices(options.voicesRaw);

  console.log(`Using project ${projectRef}.`);
  console.log(
    `Voices: ${voices.map((voice) => `${voice.label}:${voice.id}`).join(", ")}`,
  );

  const [items, scripts] = await Promise.all([
    fetchPublicPrayerItems({ serviceRoleKey, supabaseUrl }),
    fetchPrayerScripts({ serviceRoleKey, supabaseUrl }),
  ]);

  const publicItemById = new Map(
    items.filter((item) => item.id).map((item) => [item.id, item]),
  );

  const filteredScripts = scripts
    .filter((script) => {
      if (
        !script?.id ||
        !script?.prayer_library_item_id ||
        typeof script.script_text !== "string"
      ) {
        return false;
      }
      return publicItemById.has(script.prayer_library_item_id);
    })
    .map((script) => ({
      durationMinutes: Number(script.duration_minutes ?? 0) || null,
      language:
        typeof script.language === "string" && script.language.trim()
          ? script.language
          : "en",
      prayerLibraryItemId: script.prayer_library_item_id,
      prayerLibraryScriptId: script.id,
      scriptText: script.script_text.trim(),
      title:
        publicItemById.get(script.prayer_library_item_id)?.title?.trim() ||
        null,
    }))
    .filter((script) => Boolean(script.scriptText));

  const jobs = [];
  for (const script of filteredScripts) {
    for (const voice of voices) {
      jobs.push({
        ...script,
        voice,
      });
    }
  }

  const limitedJobs =
    options.limit && options.limit > 0 ? jobs.slice(0, options.limit) : jobs;

  console.log(
    `${options.dryRun ? "Planned" : "Starting"} prewarm for ${limitedJobs.length} artifacts (${filteredScripts.length} scripts x ${voices.length} voices).`,
  );

  if (options.dryRun) {
    limitedJobs.slice(0, 20).forEach((job, index) => {
      console.log(
        `[dry-run ${index + 1}] ${job.title ?? "Untitled"} (${job.durationMinutes ?? "?"} min, ${job.language}) -> ${job.voice.label}`,
      );
    });
    if (limitedJobs.length > 20) {
      console.log(`...and ${limitedJobs.length - 20} more`);
    }
    return;
  }

  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  await runWithConcurrency(
    limitedJobs,
    options.concurrency,
    async (job, index) => {
      try {
        await invokeGeneratePrayerAudio({
          job,
          serviceRoleKey,
          supabaseUrl,
        });
        successCount += 1;
        console.log(
          `[${index + 1}/${limitedJobs.length}] OK ${job.title ?? "Untitled"} ${job.durationMinutes ?? "?"}m -> ${job.voice.label}`,
        );
      } catch (error) {
        failureCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({
          message,
          title: job.title,
          voice: job.voice.label,
        });
        console.error(
          `[${index + 1}/${limitedJobs.length}] FAIL ${job.title ?? "Untitled"} -> ${job.voice.label}: ${message}`,
        );
      }
    },
  );

  console.log(
    `Prewarm complete. Success: ${successCount}. Failed: ${failureCount}.`,
  );
  if (failures.length > 0) {
    console.log("Failure summary:");
    failures.slice(0, 20).forEach((entry) => {
      console.log(
        `- ${entry.title ?? "Untitled"} (${entry.voice}): ${entry.message}`,
      );
    });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Prewarm failed: ${message}`);
  process.exit(1);
});
