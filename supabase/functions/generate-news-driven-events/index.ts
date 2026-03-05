import { createClient } from "npm:@supabase/supabase-js@2.57.4";

import { corsHeaders } from "../_shared/cors.ts";

interface NewsDrivenEventRow {
  category: string;
  country_code: string | null;
  created_at: string;
  duration_minutes: number;
  event_day: string;
  headline: string;
  id: string;
  location_hint: string | null;
  script_text: string;
  source_title: string | null;
  source_url: string;
  starts_at: string;
  summary: string;
}

interface CuratedNewsEventSeed {
  category: string;
  countryCode: string | null;
  durationMinutes: 5 | 10 | 15;
  headline: string;
  locationHint: string | null;
  script: string;
  sourceUrl: string;
  summary: string;
}

const MAX_RETURN_DAYS = 7;
const CURATED_SOURCE_TITLE = "Egregor Curated";
const CURATED_NEWS_EVENT_SEEDS: CuratedNewsEventSeed[] = [
  {
    category: "Peace",
    countryCode: null,
    durationMinutes: 10,
    headline: "Peace for the Middle East",
    locationHint: "Middle East",
    script: "Peace for the Middle East",
    sourceUrl: "https://egregor.world/news/peace-for-the-middle-east",
    summary:
      "A focused collective intention for de-escalation, dignity, and durable peace across the Middle East.",
  },
  {
    category: "Freedom",
    countryCode: "PS",
    durationMinutes: 10,
    headline: "Freedom for the people of Palestine",
    locationHint: "Palestine",
    script: "Freedom for the people of Palestine",
    sourceUrl: "https://egregor.world/news/freedom-for-the-people-of-palestine",
    summary:
      "A collective prayer for freedom, safety, and human dignity for the people of Palestine.",
  },
];

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function toUtcDateString(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function nextQuarterHour(date: Date) {
  const next = new Date(date);
  next.setUTCSeconds(0, 0);

  const minutes = next.getUTCMinutes();
  const minutesToAdd = (15 - (minutes % 15)) % 15;
  next.setUTCMinutes(minutes + (minutesToAdd === 0 ? 15 : minutesToAdd));
  return next;
}

function buildCuratedRows(now: Date) {
  const firstStart = nextQuarterHour(now);

  return CURATED_NEWS_EVENT_SEEDS.map((seed, index) => {
    const startsAt = new Date(
      firstStart.getTime() + index * 3 * 60 * 60 * 1000,
    );

    return {
      category: seed.category,
      country_code: seed.countryCode,
      duration_minutes: seed.durationMinutes,
      event_day: toUtcDateString(startsAt),
      headline: seed.headline,
      location_hint: seed.locationHint,
      script_text: seed.script,
      source_title: CURATED_SOURCE_TITLE,
      source_url: seed.sourceUrl,
      starts_at: startsAt.toISOString(),
      summary: seed.summary,
    };
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      detail: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.",
      error: "Missing Supabase configuration",
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const endIso = new Date(
      now.getTime() + MAX_RETURN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const curatedRows = buildCuratedRows(now);

    if (curatedRows.length > 0) {
      const { error: insertError } = await supabase
        .from("news_driven_events")
        .upsert(curatedRows, { onConflict: "source_url,event_day" });

      if (insertError) {
        return jsonResponse(500, {
          detail: insertError.message,
          error: "Failed to insert curated news driven events",
        });
      }
    }

    const { data: rows, error: fetchError } = await supabase
      .from("news_driven_events")
      .select(
        "id,source_url,source_title,headline,summary,script_text,category,country_code,location_hint,duration_minutes,starts_at,event_day,created_at",
      )
      .gte("starts_at", nowIso)
      .lte("starts_at", endIso)
      .order("starts_at", { ascending: true });

    if (fetchError) {
      return jsonResponse(500, {
        detail: fetchError.message,
        error: "Failed to load curated news driven events",
      });
    }

    return jsonResponse(200, {
      events: (rows ?? []) as NewsDrivenEventRow[],
      generated: curatedRows.length,
      pulled: 0,
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Unknown error while syncing events.";
    return jsonResponse(500, {
      detail,
      error: "Unhandled generate-news-driven-events failure",
    });
  }
});
