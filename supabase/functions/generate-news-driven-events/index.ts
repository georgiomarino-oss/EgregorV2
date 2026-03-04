import OpenAI from 'npm:openai@4.104.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

import { corsHeaders } from '../_shared/cors.ts';

interface NewsDrivenEventRow {
  category: string;
  created_at: string;
  duration_minutes: number;
  event_day: string;
  headline: string;
  id: string;
  script_text: string;
  source_title: string | null;
  source_url: string;
  starts_at: string;
  summary: string;
}

interface RssEntry {
  description: string;
  link: string;
  publishedAt: string;
  sourceTitle: string;
  title: string;
}

interface NewsScriptCandidate {
  category: string;
  durationMinutes: 5 | 10 | 15;
  include: boolean;
  index: number;
  script: string;
  summary: string;
  title: string;
}

const MAX_NEWS_EVENTS_PER_DAY = 5;
const MAX_RETURN_DAYS = 7;
const GOOGLE_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=natural+disaster+humanitarian+aid',
  'https://news.google.com/rss/search?q=war+humanitarian+crisis+aid',
  'https://news.google.com/rss/search?q=famine+food+crisis+relief',
  'https://news.google.com/rss/search?q=refugee+humanitarian+support',
  'https://news.google.com/rss/search?q=earthquake+flood+wildfire+response',
];
const NEWS_RELEVANCE_KEYWORDS = [
  'humanitarian',
  'aid',
  'relief',
  'disaster',
  'earthquake',
  'flood',
  'wildfire',
  'war',
  'conflict',
  'famine',
  'refugee',
  'drought',
  'crisis',
  'evacuation',
  'ceasefire',
  'shelter',
  'recovery',
  'emergency',
];
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const HEADLINE_SOURCE_SPLIT_PATTERN = /\s+-\s+[^-]+$/;
const HYPHEN_LIKE_PATTERN = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;

function toUtcDateString(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

function sanitizeReadableText(value: string) {
  return value
    .normalize('NFKC')
    .replace(URL_PATTERN, '')
    .replace(HYPHEN_LIKE_PATTERN, ' ')
    .replace(/[_*`~>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function sanitizeHeadline(value: string) {
  return sanitizeReadableText(value)
    .replace(HEADLINE_SOURCE_SPLIT_PATTERN, '')
    .replace(/^\W+|\W+$/g, '')
    .slice(0, 100)
    .trim();
}

function sanitizeScript(value: string) {
  const blocks = value
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => sanitizeReadableText(block))
    .filter((block) => block.length > 0)
    .map((block) => (/([.?!])$/.test(block) ? block : `${block}.`));

  return blocks.join('\n\n').trim();
}

function extractJson(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return '';
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function extractResponseText(response: OpenAI.Responses.Response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks: string[] = [];
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim());
      }
      if (typeof part?.output_text === 'string' && part.output_text.trim()) {
        chunks.push(part.output_text.trim());
      }
    }
  }

  return chunks.join('\n').trim();
}

function parseRssEntries(xml: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');
  if (!document) {
    return [] as RssEntry[];
  }

  const itemNodes = Array.from(document.querySelectorAll('item'));

  return itemNodes
    .map((node) => {
      const title = node.querySelector('title')?.textContent?.trim() ?? '';
      const link = node.querySelector('link')?.textContent?.trim() ?? '';
      const description = node.querySelector('description')?.textContent?.trim() ?? '';
      const sourceTitle = node.querySelector('source')?.textContent?.trim() ?? '';
      const publishedAt = node.querySelector('pubDate')?.textContent?.trim() ?? '';

      return {
        description,
        link,
        publishedAt,
        sourceTitle,
        title,
      } satisfies RssEntry;
    })
    .filter((item) => item.title && item.link);
}

async function fetchRssEntries() {
  const allEntries: RssEntry[] = [];

  for (const feedUrl of GOOGLE_RSS_FEEDS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(feedUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1',
        },
      });

      if (!response.ok) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const xml = await response.text();
      const parsed = parseRssEntries(xml).slice(0, 12);
      allEntries.push(...parsed);
    } catch {
      // Continue with other feeds.
    }
  }

  const deduped = new Map<string, RssEntry>();
  for (const entry of allEntries) {
    const key = `${entry.link}|${entry.title}`.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values());
}

function isManifestationRelevant(entry: RssEntry) {
  const corpus = `${entry.title} ${entry.description}`.toLowerCase();
  return NEWS_RELEVANCE_KEYWORDS.some((keyword) => corpus.includes(keyword));
}

async function generateCandidatesWithOpenAI(openai: OpenAI, entries: RssEntry[], maxCount: number) {
  if (entries.length === 0 || maxCount <= 0) {
    return [] as NewsScriptCandidate[];
  }

  const compactEntries = entries.slice(0, 20).map((entry, index) => ({
    description: sanitizeReadableText(entry.description).slice(0, 200),
    index,
    link: entry.link,
    publishedAt: entry.publishedAt,
    source: sanitizeReadableText(entry.sourceTitle).slice(0, 80),
    title: sanitizeHeadline(entry.title),
  }));

  const response = await openai.responses.create({
    input: [
      {
        role: 'system',
        content:
          'You convert humanitarian news into short guided intention events. Return clean JSON only. Titles and scripts must be spoken clearly by text to speech. Do not include urls, source names, metadata, markdown, or hashtags. Use complete grammar.',
      },
      {
        role: 'user',
        content: `From this JSON input, select at most ${maxCount} items that fit manifestation or intention gatherings for global prayer support.\nInput: ${JSON.stringify(
          compactEntries,
        )}\n\nReturn JSON array items with fields: index, include, title, summary, script, category, durationMinutes.\nRules:\n- category must be one of: Humanitarian, Peace, Recovery, Relief\n- durationMinutes must be 5, 10, or 15\n- summary max 140 chars\n- script should be 120 to 220 words, smooth for voice narration\n- include=false for items that do not fit\n- no URLs or metadata in title/summary/script`,
      },
    ],
    model: 'gpt-4.1-mini',
    temperature: 0.35,
  });

  const raw = extractResponseText(response);
  const jsonText = extractJson(raw);
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => ({
      category: sanitizeReadableText(String(item?.category ?? 'Humanitarian')),
      durationMinutes: Number(item?.durationMinutes) as 5 | 10 | 15,
      include: Boolean(item?.include),
      index: Number(item?.index),
      script: sanitizeScript(String(item?.script ?? '')),
      summary: sanitizeReadableText(String(item?.summary ?? '')).slice(0, 140),
      title: sanitizeHeadline(String(item?.title ?? '')),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.index) &&
        item.title.length > 0 &&
        item.summary.length > 0 &&
        item.script.length > 0 &&
        [5, 10, 15].includes(item.durationMinutes),
    )
    .slice(0, maxCount);
}

function nextSlots(now: Date, count: number, existingByDay: Map<string, number>) {
  const preferredHoursUtc = [2, 7, 12, 17, 22];
  const slots: Date[] = [];

  let dayOffset = 0;
  while (slots.length < count && dayOffset < MAX_RETURN_DAYS + 2) {
    for (const hour of preferredHoursUtc) {
      if (slots.length >= count) {
        break;
      }

      const date = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + dayOffset,
        hour,
        0,
        0,
      ));

      if (date.getTime() <= now.getTime()) {
        continue;
      }

      const dayKey = toUtcDateString(date);
      const countForDay = existingByDay.get(dayKey) ?? 0;
      if (countForDay >= MAX_NEWS_EVENTS_PER_DAY) {
        continue;
      }

      existingByDay.set(dayKey, countForDay + 1);
      slots.push(date);
    }

    dayOffset += 1;
  }

  return slots;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!openAiApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const todayKey = toUtcDateString(now);
  const endDate = new Date(now.getTime() + MAX_RETURN_DAYS * 24 * 60 * 60 * 1000);

  const { data: existingRows, error: existingError } = await supabase
    .from('news_driven_events')
    .select('id,source_url,source_title,headline,summary,script_text,category,duration_minutes,starts_at,event_day,created_at')
    .gte('starts_at', now.toISOString())
    .lte('starts_at', endDate.toISOString())
    .order('starts_at', { ascending: true });

  if (existingError) {
    return new Response(
      JSON.stringify({ error: 'Failed to load existing news driven events', detail: existingError.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }

  const upcomingRows = ((existingRows ?? []) as NewsDrivenEventRow[]).filter((row) =>
    new Date(row.starts_at).getTime() >= now.getTime(),
  );

  const existingByDay = new Map<string, number>();
  for (const row of upcomingRows) {
    const day = row.event_day;
    existingByDay.set(day, (existingByDay.get(day) ?? 0) + 1);
  }

  const todayCount = existingByDay.get(todayKey) ?? 0;
  const neededToday = Math.max(0, MAX_NEWS_EVENTS_PER_DAY - todayCount);

  if (neededToday <= 0) {
    return new Response(JSON.stringify({ events: upcomingRows, generated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const rssEntries = await fetchRssEntries();
  const relevantEntries = rssEntries.filter(isManifestationRelevant);

  if (relevantEntries.length === 0) {
    return new Response(JSON.stringify({ events: upcomingRows, generated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const openai = new OpenAI({ apiKey: openAiApiKey });

  let candidates: NewsScriptCandidate[] = [];
  try {
    candidates = await generateCandidatesWithOpenAI(openai, relevantEntries, neededToday);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: 'Failed to generate news scripts', detail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });
  }

  const selected = candidates.filter((item) => item.include).slice(0, neededToday);
  if (selected.length === 0) {
    return new Response(JSON.stringify({ events: upcomingRows, generated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const schedule = nextSlots(now, selected.length, existingByDay);

  const toInsert = selected
    .map((candidate, index) => {
      const source = relevantEntries[candidate.index];
      const startsAt = schedule[index];
      if (!source || !startsAt) {
        return null;
      }

      const eventDay = toUtcDateString(startsAt);
      return {
        category: candidate.category || 'Humanitarian',
        duration_minutes: candidate.durationMinutes,
        event_day: eventDay,
        headline: sanitizeHeadline(candidate.title || source.title),
        script_text: sanitizeScript(candidate.script),
        source_title: sanitizeReadableText(source.sourceTitle).slice(0, 120) || null,
        source_url: source.link,
        starts_at: startsAt.toISOString(),
        summary: sanitizeReadableText(candidate.summary).slice(0, 160),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('news_driven_events')
      .upsert(toInsert, { onConflict: 'source_url,event_day' });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save generated news driven events', detail: insertError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }
  }

  const { data: refreshedRows, error: refreshedError } = await supabase
    .from('news_driven_events')
    .select('id,source_url,source_title,headline,summary,script_text,category,duration_minutes,starts_at,event_day,created_at')
    .gte('starts_at', now.toISOString())
    .lte('starts_at', endDate.toISOString())
    .order('starts_at', { ascending: true });

  if (refreshedError) {
    return new Response(
      JSON.stringify({ error: 'Failed to load refreshed news driven events', detail: refreshedError.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }

  return new Response(
    JSON.stringify({
      events: refreshedRows ?? [],
      generated: toInsert.length,
      pulled: relevantEntries.length,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
});
