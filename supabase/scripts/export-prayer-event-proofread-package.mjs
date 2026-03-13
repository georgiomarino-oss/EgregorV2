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
    horizonDays: Number(process.env.EVENT_EXPORT_HORIZON_DAYS ?? 540),
    outputDir: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith("--horizon-days=")) {
      options.horizonDays = Number(arg.split("=", 2)[1]);
      continue;
    }

    if (arg.startsWith("--output-dir=")) {
      options.outputDir = arg.split("=", 2)[1] ?? null;
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

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column] ?? "")).join(",")
  );
  return [header, ...lines].join("\n");
}

function normalizeCategory(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "Uncategorized";
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveEventDisplayTitle(seriesKey, seriesName, occurrenceMetadata, startsAtUtc) {
  const safeSeriesName = normalizeString(seriesName) || "Untitled Event";
  const metadata = normalizeObject(occurrenceMetadata);
  const lunarName = normalizeString(metadata.lunar_name);
  const lunarPhase = normalizeString(metadata.lunar_phase).toLowerCase();

  if (seriesKey === "full-moon-gathering" && lunarName) {
    return `${lunarName} Full Moon Gathering`;
  }

  if (seriesKey === "new-moon-intention-setting" && lunarPhase === "new_moon") {
    const startsAtMillis = new Date(startsAtUtc).getTime();
    if (Number.isFinite(startsAtMillis)) {
      const monthPrefix = new Date(startsAtMillis).toLocaleString("en-US", {
        month: "long",
        timeZone: "UTC",
      });
      return `${monthPrefix} New Moon Intention Setting`;
    }
  }

  return safeSeriesName;
}

async function fetchPaginated({ buildPath, serviceRoleKey, supabaseUrl }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRestRequest({
      pathWithQuery: buildPath(offset),
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

async function fetchPublicPrayerItems({ serviceRoleKey, supabaseUrl }) {
  return fetchPaginated({
    buildPath: (offset) =>
      `/rest/v1/prayer_library_items?select=id,title,category,duration_minutes,is_public,created_at&is_public=eq.true&order=category.asc,title.asc&limit=${PAGE_SIZE}&offset=${offset}`,
    serviceRoleKey,
    supabaseUrl,
  });
}

async function fetchPrayerScripts({ serviceRoleKey, supabaseUrl }) {
  return fetchPaginated({
    buildPath: (offset) =>
      `/rest/v1/prayer_library_scripts?select=id,prayer_library_item_id,duration_minutes,language,script_text,word_count,tone,model,updated_at&language=eq.en&order=prayer_library_item_id.asc,duration_minutes.asc&limit=${PAGE_SIZE}&offset=${offset}`,
    serviceRoleKey,
    supabaseUrl,
  });
}

async function fetchCanonicalGlobalSeries({ serviceRoleKey, supabaseUrl }) {
  return fetchPaginated({
    buildPath: (offset) =>
      `/rest/v1/event_series?select=id,key,name,subtitle,description,category,schedule_type,timezone_policy,local_time,local_timezone,utc_interval_minutes,default_duration_minutes,visibility_scope,access_mode,metadata,is_active,created_by&is_active=eq.true&visibility_scope=eq.global&created_by=is.null&order=key.asc&limit=${PAGE_SIZE}&offset=${offset}`,
    serviceRoleKey,
    supabaseUrl,
  });
}

async function fetchEventOccurrencesForSeries({
  horizonEndIso,
  horizonStartIso,
  seriesIds,
  serviceRoleKey,
  supabaseUrl,
}) {
  const rows = [];

  for (const seriesIdChunk of chunk(seriesIds, 50)) {
    const inFilter = quoteInFilterValues(seriesIdChunk);
    const pages = await fetchPaginated({
      buildPath: (offset) =>
        `/rest/v1/event_occurrences?select=id,series_id,occurrence_key,starts_at_utc,ends_at_utc,display_timezone,status,metadata&series_id=in.(${inFilter})&starts_at_utc=gte.${encodeURIComponent(horizonStartIso)}&starts_at_utc=lte.${encodeURIComponent(horizonEndIso)}&order=starts_at_utc.asc&limit=${PAGE_SIZE}&offset=${offset}`,
      serviceRoleKey,
      supabaseUrl,
    });

    rows.push(...pages);
  }

  return rows;
}

async function fetchEventOccurrenceContent({
  occurrenceIds,
  serviceRoleKey,
  supabaseUrl,
}) {
  const rows = [];
  for (const occurrenceIdChunk of chunk(occurrenceIds, 50)) {
    const inFilter = quoteInFilterValues(occurrenceIdChunk);
    const page = await supabaseRestRequest({
      pathWithQuery:
        `/rest/v1/event_occurrence_content?select=id,occurrence_id,series_id,language,duration_minutes,script_text,script_word_count,script_tone,script_model,script_prompt_version,voice_id,voice_label,audio_status,has_word_timings,updated_at,metadata&language=eq.en&occurrence_id=in.(${inFilter})`,
      serviceRoleKey,
      supabaseUrl,
    });

    if (Array.isArray(page)) {
      rows.push(...page);
    }
  }

  return rows;
}

function buildScheduleSummary(series) {
  const scheduleType = normalizeString(series.schedule_type) || "unknown";
  if (scheduleType === "utc_interval") {
    const interval = Number(series.utc_interval_minutes);
    return Number.isFinite(interval) && interval > 0
      ? `Every ${interval} minutes (UTC interval)`
      : "UTC interval";
  }

  if (scheduleType === "local_time_daily") {
    const localTime = normalizeString(series.local_time);
    const localTimezone = normalizeString(series.local_timezone);
    if (localTime && localTimezone) {
      return `Daily at ${localTime} (${localTimezone})`;
    }
    if (localTime) {
      return `Daily at ${localTime}`;
    }
    return "Local daily";
  }

  if (scheduleType === "lunar_phase") {
    const metadata = normalizeObject(series.metadata);
    const lunarPhase = normalizeString(metadata.lunar_phase);
    return lunarPhase ? `Lunar phase (${lunarPhase})` : "Lunar phase";
  }

  return scheduleType;
}

function buildMarkdown({
  eventRowsAll,
  eventRowsWithScripts,
  generatedAtIso,
  horizonDays,
  prayerRows,
  projectRef,
}) {
  const prayerCount = prayerRows.length;
  const eventCount = eventRowsAll.length;
  const eventScriptReadyCount = eventRowsWithScripts.length;

  const seriesCount = new Set(eventRowsAll.map((row) => row.event_series_key)).size;
  const missingPrayerScriptCount = prayerRows.filter((row) => !normalizeString(row.script_text)).length;
  const missingEventScriptCount = eventRowsAll.filter((row) => !normalizeString(row.script_text)).length;

  const summaryLines = [
    "# Prayer And Event Script Proofread + Design Handoff",
    "",
    `Generated: ${generatedAtIso}`,
    `Supabase project ref: \`${projectRef}\``,
    `Event horizon exported: next ${horizonDays} days`,
    "",
    "## Export summary",
    `- Prayer script rows exported: ${prayerCount}`,
    `- Event occurrence rows exported (full schedule): ${eventCount}`,
    `- Event occurrence rows exported (script-ready): ${eventScriptReadyCount}`,
    `- Canonical event series represented: ${seriesCount}`,
    `- Prayer rows missing script text: ${missingPrayerScriptCount}`,
    `- Event rows missing script text: ${missingEventScriptCount}`,
    "",
    "## Files in this package",
    "- `mobile/docs/redesign/prayer-script-proofread.csv`",
    "- `mobile/docs/redesign/event-occurrence-schedule-all.csv`",
    "- `mobile/docs/redesign/event-occurrence-script-proofread.csv`",
    "- `mobile/docs/redesign/event-series-design-reference.csv`",
    "",
    "## Column guide",
    "",
    "### Prayer CSV (`prayer-script-proofread.csv`)",
    "- `prayer_title`",
    "- `prayer_category`",
    "- `duration_minutes`",
    "- `script_text`",
    "",
    "### Event occurrence CSV (`event-occurrence-schedule-all.csv`)",
    "- `scheduled_start_utc`",
    "- `event_display_title`",
    "- `event_series_name`",
    "- `event_category`",
    "- `script_text`",
    "",
    "### Event script-only CSV (`event-occurrence-script-proofread.csv`)",
    "- Same columns as full schedule export, filtered to rows with non-empty `script_text` for proofreading.",
    "",
    "### Event series design CSV (`event-series-design-reference.csv`)",
    "- `series_name`",
    "- `series_category`",
    "- `schedule_summary`",
    "- `series_metadata_json`",
    "",
    "Use these exports for script proofreading and for replacing card/background visual assets in design.",
    "",
  ];

  return summaryLines.join("\n");
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

  const outputDir = options.outputDir
    ? path.resolve(rootDir, options.outputDir)
    : path.join(rootDir, "mobile", "docs", "redesign");
  fs.mkdirSync(outputDir, { recursive: true });

  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();
  const horizonStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const horizonEnd = new Date(
    Date.now() + options.horizonDays * 24 * 60 * 60 * 1000,
  );

  console.log(`Using project ${projectRef}.`);
  console.log(
    `Exporting prayers + events for horizon ${horizonStart.toISOString()} -> ${horizonEnd.toISOString()}.`,
  );

  const [prayerItems, prayerScripts, seriesRows] = await Promise.all([
    fetchPublicPrayerItems({ serviceRoleKey, supabaseUrl }),
    fetchPrayerScripts({ serviceRoleKey, supabaseUrl }),
    fetchCanonicalGlobalSeries({ serviceRoleKey, supabaseUrl }),
  ]);

  const prayerItemById = new Map();
  for (const row of prayerItems) {
    const id = normalizeString(row.id);
    if (id) {
      prayerItemById.set(id, row);
    }
  }

  const prayerRows = prayerScripts
    .map((scriptRow) => {
      const itemId = normalizeString(scriptRow.prayer_library_item_id);
      const item = prayerItemById.get(itemId);
      if (!item) {
        return null;
      }

      return {
        prayer_id: normalizeString(item.id),
        prayer_title: normalizeString(item.title),
        prayer_category: normalizeCategory(item.category),
        duration_minutes: Number(scriptRow.duration_minutes) || Number(item.duration_minutes) || 0,
        script_language: normalizeString(scriptRow.language) || "en",
        script_word_count: Number(scriptRow.word_count) || 0,
        script_tone: normalizeString(scriptRow.tone),
        script_model: normalizeString(scriptRow.model),
        script_updated_at: normalizeString(scriptRow.updated_at),
        script_text: typeof scriptRow.script_text === "string" ? scriptRow.script_text.trim() : "",
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const categoryCompare = left.prayer_category.localeCompare(right.prayer_category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      const titleCompare = left.prayer_title.localeCompare(right.prayer_title);
      if (titleCompare !== 0) {
        return titleCompare;
      }
      return left.duration_minutes - right.duration_minutes;
    });

  const seriesById = new Map();
  for (const row of seriesRows) {
    const id = normalizeString(row.id);
    if (id) {
      seriesById.set(id, row);
    }
  }

  const seriesIds = Array.from(seriesById.keys());
  const occurrences = seriesIds.length
    ? await fetchEventOccurrencesForSeries({
        horizonEndIso: horizonEnd.toISOString(),
        horizonStartIso: horizonStart.toISOString(),
        seriesIds,
        serviceRoleKey,
        supabaseUrl,
      })
    : [];

  const occurrenceIds = occurrences
    .map((row) => normalizeString(row.id))
    .filter(Boolean);

  const occurrenceContentRows = occurrenceIds.length
    ? await fetchEventOccurrenceContent({
        occurrenceIds,
        serviceRoleKey,
        supabaseUrl,
      })
    : [];

  const occurrenceContentByOccurrenceId = new Map();
  for (const row of occurrenceContentRows) {
    const occurrenceId = normalizeString(row.occurrence_id);
    if (!occurrenceId) {
      continue;
    }
    occurrenceContentByOccurrenceId.set(occurrenceId, row);
  }

  const eventRows = occurrences
    .map((occurrence) => {
      const occurrenceId = normalizeString(occurrence.id);
      const seriesId = normalizeString(occurrence.series_id);
      if (!occurrenceId || !seriesId) {
        return null;
      }

      const series = seriesById.get(seriesId);
      if (!series) {
        return null;
      }

      const content = occurrenceContentByOccurrenceId.get(occurrenceId);
      const occurrenceMetadata = normalizeObject(occurrence.metadata);
      const seriesMetadata = normalizeObject(series.metadata);
      const displayTitle = resolveEventDisplayTitle(
        normalizeString(series.key),
        normalizeString(series.name),
        occurrenceMetadata,
        normalizeString(occurrence.starts_at_utc),
      );

      return {
        occurrence_id: occurrenceId,
        occurrence_key: normalizeString(occurrence.occurrence_key),
        event_display_title: displayTitle,
        event_series_key: normalizeString(series.key),
        event_series_name: normalizeString(series.name),
        event_category: normalizeCategory(series.category),
        event_status: normalizeString(occurrence.status) || "scheduled",
        scheduled_start_utc: normalizeString(occurrence.starts_at_utc),
        scheduled_end_utc: normalizeString(occurrence.ends_at_utc),
        display_timezone: normalizeString(occurrence.display_timezone) || "UTC",
        schedule_type: normalizeString(series.schedule_type),
        schedule_summary: buildScheduleSummary(series),
        series_default_duration_minutes: Number(series.default_duration_minutes) || 0,
        content_duration_minutes: Number(content?.duration_minutes) || Number(series.default_duration_minutes) || 0,
        script_language: normalizeString(content?.language) || "en",
        script_word_count: Number(content?.script_word_count) || 0,
        script_tone: normalizeString(content?.script_tone),
        script_model: normalizeString(content?.script_model),
        script_prompt_version: normalizeString(content?.script_prompt_version),
        voice_label: normalizeString(content?.voice_label),
        voice_id: normalizeString(content?.voice_id),
        audio_status: normalizeString(content?.audio_status),
        has_word_timings: Boolean(content?.has_word_timings),
        script_updated_at: normalizeString(content?.updated_at),
        script_text:
          typeof content?.script_text === "string" ? content.script_text.trim() : "",
        lunar_name: normalizeString(occurrenceMetadata.lunar_name),
        lunar_phase: normalizeString(occurrenceMetadata.lunar_phase),
        has_lunar_eclipse: Boolean(occurrenceMetadata.has_lunar_eclipse),
        eclipse_label: normalizeString(occurrenceMetadata.eclipse_label),
        series_metadata_json: JSON.stringify(seriesMetadata),
        occurrence_metadata_json: JSON.stringify(occurrenceMetadata),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.scheduled_start_utc.localeCompare(right.scheduled_start_utc));
  const eventRowsWithScripts = eventRows.filter((row) => normalizeString(row.script_text));

  const seriesReferenceRows = seriesRows
    .map((series) => ({
      series_id: normalizeString(series.id),
      series_key: normalizeString(series.key),
      series_name: normalizeString(series.name),
      series_subtitle: normalizeString(series.subtitle),
      series_description: normalizeString(series.description),
      series_category: normalizeCategory(series.category),
      schedule_type: normalizeString(series.schedule_type),
      schedule_summary: buildScheduleSummary(series),
      timezone_policy: normalizeString(series.timezone_policy),
      local_time: normalizeString(series.local_time),
      local_timezone: normalizeString(series.local_timezone),
      utc_interval_minutes: Number(series.utc_interval_minutes) || 0,
      default_duration_minutes: Number(series.default_duration_minutes) || 0,
      visibility_scope: normalizeString(series.visibility_scope),
      access_mode: normalizeString(series.access_mode),
      series_metadata_json: JSON.stringify(normalizeObject(series.metadata)),
    }))
    .sort((left, right) => left.series_key.localeCompare(right.series_key));

  const prayerCsvPath = path.join(outputDir, "prayer-script-proofread.csv");
  const eventAllCsvPath = path.join(outputDir, "event-occurrence-schedule-all.csv");
  const eventCsvPath = path.join(outputDir, "event-occurrence-script-proofread.csv");
  const seriesCsvPath = path.join(outputDir, "event-series-design-reference.csv");
  const markdownPath = path.join(outputDir, "prayer-event-script-proofread-handoff.md");

  fs.writeFileSync(
    prayerCsvPath,
    toCsv(prayerRows, [
      "prayer_id",
      "prayer_title",
      "prayer_category",
      "duration_minutes",
      "script_language",
      "script_word_count",
      "script_tone",
      "script_model",
      "script_updated_at",
      "script_text",
    ]),
    "utf8",
  );

  fs.writeFileSync(
    eventAllCsvPath,
    toCsv(eventRows, [
      "occurrence_id",
      "occurrence_key",
      "event_display_title",
      "event_series_key",
      "event_series_name",
      "event_category",
      "event_status",
      "scheduled_start_utc",
      "scheduled_end_utc",
      "display_timezone",
      "schedule_type",
      "schedule_summary",
      "series_default_duration_minutes",
      "content_duration_minutes",
      "script_language",
      "script_word_count",
      "script_tone",
      "script_model",
      "script_prompt_version",
      "voice_label",
      "voice_id",
      "audio_status",
      "has_word_timings",
      "script_updated_at",
      "lunar_name",
      "lunar_phase",
      "has_lunar_eclipse",
      "eclipse_label",
      "script_text",
    ]),
    "utf8",
  );

  fs.writeFileSync(
    eventCsvPath,
    toCsv(eventRowsWithScripts, [
      "occurrence_id",
      "occurrence_key",
      "event_display_title",
      "event_series_key",
      "event_series_name",
      "event_category",
      "event_status",
      "scheduled_start_utc",
      "scheduled_end_utc",
      "display_timezone",
      "schedule_type",
      "schedule_summary",
      "series_default_duration_minutes",
      "content_duration_minutes",
      "script_language",
      "script_word_count",
      "script_tone",
      "script_model",
      "script_prompt_version",
      "voice_label",
      "voice_id",
      "audio_status",
      "has_word_timings",
      "script_updated_at",
      "lunar_name",
      "lunar_phase",
      "has_lunar_eclipse",
      "eclipse_label",
      "script_text",
    ]),
    "utf8",
  );

  fs.writeFileSync(
    seriesCsvPath,
    toCsv(seriesReferenceRows, [
      "series_id",
      "series_key",
      "series_name",
      "series_subtitle",
      "series_description",
      "series_category",
      "schedule_type",
      "schedule_summary",
      "timezone_policy",
      "local_time",
      "local_timezone",
      "utc_interval_minutes",
      "default_duration_minutes",
      "visibility_scope",
      "access_mode",
      "series_metadata_json",
    ]),
    "utf8",
  );

  fs.writeFileSync(
    markdownPath,
    buildMarkdown({
      eventRowsAll: eventRows,
      eventRowsWithScripts,
      generatedAtIso,
      horizonDays: options.horizonDays,
      prayerRows,
      projectRef,
    }),
    "utf8",
  );

  console.log(`Wrote ${prayerRows.length} prayer rows -> ${prayerCsvPath}`);
  console.log(`Wrote ${eventRows.length} event occurrence rows (all schedule) -> ${eventAllCsvPath}`);
  console.log(`Wrote ${eventRowsWithScripts.length} event occurrence rows (script-ready) -> ${eventCsvPath}`);
  console.log(`Wrote ${seriesReferenceRows.length} event series rows -> ${seriesCsvPath}`);
  console.log(`Wrote handoff summary -> ${markdownPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[export-prayer-event-proofread-package] ${message}`);
  process.exit(1);
});
