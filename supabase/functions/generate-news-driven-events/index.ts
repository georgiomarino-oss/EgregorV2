import OpenAI from 'npm:openai@4.104.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

import { corsHeaders } from '../_shared/cors.ts';

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

interface RssEntry {
  description: string;
  link: string;
  publishedAt: string;
  sourceUrl: string;
  sourceTitle: string;
  title: string;
}

interface NewsScriptCandidate {
  category: string;
  countryCode?: string | null;
  durationMinutes: 5 | 10 | 15;
  include: boolean;
  index: number;
  locationHint?: string | null;
  script: string;
  summary: string;
  title: string;
}

interface PreparedNewsEntry extends RssEntry {
  countryCode: string;
  locationHint: string;
  publishedMillis: number;
}

interface GdeltResponse {
  articles?: Array<{
    domain?: string;
    seendate?: string;
    title?: string;
    url?: string;
  }>;
}

const MAX_NEWS_EVENTS_PER_DAY = 5;
const MAX_RETURN_DAYS = 7;
const MAX_GENERATION_PER_RUN = 12;
const GOOGLE_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=natural+disaster+humanitarian+aid',
  'https://news.google.com/rss/search?q=war+humanitarian+crisis+aid',
  'https://news.google.com/rss/search?q=famine+food+crisis+relief',
  'https://news.google.com/rss/search?q=refugee+humanitarian+support',
  'https://news.google.com/rss/search?q=earthquake+flood+wildfire+response',
];
const FALLBACK_RSS_FEEDS = [
  'https://reliefweb.int/updates?format=xml',
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
];
const GDELT_API_URL =
  'https://api.gdeltproject.org/api/v2/doc/doc?query=(humanitarian%20OR%20refugee%20OR%20earthquake%20OR%20flood%20OR%20wildfire%20OR%20famine%20OR%20conflict%20OR%20ceasefire)&mode=ArtList&format=json&maxrecords=40&sort=DateDesc';
const RSS_FETCH_TIMEOUT_MS = 12_000;
const MAX_SOURCE_EVENT_AGE_DAYS = 10;
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
const EVENT_SIGNAL_KEYWORDS = [
  'earthquake',
  'flood',
  'wildfire',
  'hurricane',
  'cyclone',
  'storm',
  'war',
  'conflict',
  'ceasefire',
  'attack',
  'airstrike',
  'bombing',
  'displaced',
  'refugee',
  'famine',
  'drought',
  'evacuation',
  'humanitarian crisis',
  'aid convoy',
  'aid appeal',
  'casualties',
  'relief',
  'emergency',
];
const STRICT_EVENT_KEYWORDS = [
  'earthquake',
  'flood',
  'wildfire',
  'hurricane',
  'cyclone',
  'storm',
  'war',
  'conflict',
  'attack',
  'airstrike',
  'bombing',
  'shelling',
  'missile',
  'killed',
  'injured',
  'casualties',
  'displaced',
  'evacuation',
  'famine',
  'drought',
  'humanitarian crisis',
  'aid convoy',
  'aid appeal',
  'ceasefire',
  'emergency',
];
const NON_EVENT_TITLE_PATTERNS = [
  'fact sheet',
  'history',
  'what is',
  'how to',
  'declaration',
  'observer',
  'policy',
  'reliefeu',
  'encyclopedia',
  'british red cross',
  'humanitarian aid -',
  'stock market',
  'stock markets',
  'energy prices',
  'trade threat',
  'pricing',
];
const LOCATION_HINTS: Array<{ countryCode: string; label: string; keywords: string[] }> = [
  { countryCode: 'IR', label: 'Iran', keywords: ['iran', 'tehran', 'isfahan', 'mashhad'] },
  { countryCode: 'IQ', label: 'Iraq', keywords: ['iraq', 'baghdad', 'basra', 'mosul'] },
  { countryCode: 'SY', label: 'Syria', keywords: ['syria', 'damascus', 'aleppo', 'idlib'] },
  { countryCode: 'PS', label: 'Palestine', keywords: ['palestine', 'gaza', 'west bank', 'rafah'] },
  { countryCode: 'IL', label: 'Israel', keywords: ['israel', 'tel aviv', 'jerusalem'] },
  { countryCode: 'LB', label: 'Lebanon', keywords: ['lebanon', 'beirut'] },
  { countryCode: 'UA', label: 'Ukraine', keywords: ['ukraine', 'kyiv', 'kiev', 'odesa', 'kharkiv'] },
  { countryCode: 'RU', label: 'Russia', keywords: ['russia', 'moscow'] },
  { countryCode: 'SD', label: 'Sudan', keywords: ['sudan', 'khartoum', 'darfur'] },
  { countryCode: 'PK', label: 'Pakistan', keywords: ['pakistan', 'karachi', 'lahore'] },
  { countryCode: 'BD', label: 'Bangladesh', keywords: ['bangladesh', 'dhaka'] },
  { countryCode: 'IN', label: 'India', keywords: ['india', 'new delhi', 'mumbai'] },
  { countryCode: 'AF', label: 'Afghanistan', keywords: ['afghanistan', 'kabul'] },
  { countryCode: 'MM', label: 'Myanmar', keywords: ['myanmar', 'yangon'] },
  { countryCode: 'CN', label: 'China', keywords: ['china', 'beijing'] },
  { countryCode: 'JP', label: 'Japan', keywords: ['japan', 'tokyo'] },
  { countryCode: 'US', label: 'United States', keywords: ['united states', 'usa', 'u.s.', 'california', 'florida', 'texas'] },
  { countryCode: 'MX', label: 'Mexico', keywords: ['mexico', 'mexico city'] },
  { countryCode: 'BR', label: 'Brazil', keywords: ['brazil', 'rio', 'sao paulo'] },
  { countryCode: 'TR', label: 'Turkey', keywords: ['turkey', 'türkiye', 'ankara', 'istanbul'] },
  { countryCode: 'NG', label: 'Nigeria', keywords: ['nigeria', 'lagos'] },
  { countryCode: 'KE', label: 'Kenya', keywords: ['kenya', 'nairobi'] },
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

  const rssItems = Array.from(document.querySelectorAll('item')).map((node) => {
    const title = node.querySelector('title')?.textContent?.trim() ?? '';
    const link = node.querySelector('link')?.textContent?.trim() ?? '';
    const description = node.querySelector('description')?.textContent?.trim() ?? '';
    const sourceNode = node.querySelector('source');
    const sourceTitle = sourceNode?.textContent?.trim() ?? '';
    const sourceUrl = sourceNode?.getAttribute('url')?.trim() ?? '';
    const publishedAt = node.querySelector('pubDate')?.textContent?.trim() ?? '';

    return {
      description,
      link,
      publishedAt,
      sourceUrl,
      sourceTitle,
      title,
    } satisfies RssEntry;
  });

  const atomEntries = Array.from(document.querySelectorAll('entry')).map((node) => {
    const title = node.querySelector('title')?.textContent?.trim() ?? '';
    const description =
      node.querySelector('summary')?.textContent?.trim() ??
      node.querySelector('content')?.textContent?.trim() ??
      '';
    const sourceTitle =
      node.querySelector('source > title')?.textContent?.trim() ??
      node.querySelector('author > name')?.textContent?.trim() ??
      '';
    const sourceUrl =
      node.querySelector('source > link')?.getAttribute('href')?.trim() ??
      node.querySelector('source > link')?.textContent?.trim() ??
      '';
    const publishedAt =
      node.querySelector('updated')?.textContent?.trim() ??
      node.querySelector('published')?.textContent?.trim() ??
      '';
    const href = node.querySelector('link')?.getAttribute('href')?.trim() ?? '';
    const link = href || (node.querySelector('link')?.textContent?.trim() ?? '');

    return {
      description,
      link,
      publishedAt,
      sourceUrl,
      sourceTitle,
      title,
    } satisfies RssEntry;
  });

  return [...rssItems, ...atomEntries].filter((item) => item.title && item.link);
}

async function fetchRssEntries() {
  const allEntries: RssEntry[] = [];
  const allFeeds = [...GOOGLE_RSS_FEEDS, ...FALLBACK_RSS_FEEDS];

  for (const feedUrl of allFeeds) {
    try {
      const timeoutSignal = AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS);
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(feedUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1',
          'Accept-Language': 'en-GB,en;q=0.9',
          Referer: 'https://news.google.com/',
          'User-Agent': 'Mozilla/5.0 (compatible; EgregorNewsBot/1.0; +https://egregor.world)',
        },
        signal: timeoutSignal,
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

async function fetchGdeltEntries() {
  try {
    const response = await fetch(GDELT_API_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; EgregorNewsBot/1.0; +https://egregor.world)',
      },
      signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return [] as RssEntry[];
    }

    const payload = (await response.json()) as GdeltResponse;
    const articles = Array.isArray(payload?.articles) ? payload.articles : [];

    return articles
      .map((article) => {
        const title = sanitizeHeadline(String(article?.title ?? ''));
        const link = String(article?.url ?? '').trim();
        const sourceTitle = sanitizeReadableText(String(article?.domain ?? '')).slice(0, 120);
        const rawSeenDate = String(article?.seendate ?? '').trim();
        let publishedAt = '';

        if (rawSeenDate.length === 16 && rawSeenDate.endsWith('Z')) {
          const iso = `${rawSeenDate.slice(0, 4)}-${rawSeenDate.slice(4, 6)}-${rawSeenDate.slice(6, 8)}T${
            rawSeenDate.slice(9, 11)
          }:${rawSeenDate.slice(11, 13)}:${rawSeenDate.slice(13, 15)}Z`;
          publishedAt = new Date(iso).toUTCString();
        }

        return {
          description: title,
          link,
          publishedAt,
          sourceUrl: link,
          sourceTitle,
          title,
        } satisfies RssEntry;
      })
      .filter((entry) => entry.title.length > 0 && entry.link.length > 0);
  } catch {
    return [] as RssEntry[];
  }
}

function isManifestationRelevant(entry: RssEntry) {
  const corpus = `${entry.title} ${entry.description}`.toLowerCase();
  return NEWS_RELEVANCE_KEYWORDS.some((keyword) => corpus.includes(keyword));
}

function parsePublishedMillis(raw: string) {
  const value = raw.trim();
  if (!value) {
    return null as number | null;
  }

  const millis = Date.parse(value);
  if (Number.isFinite(millis)) {
    return millis;
  }

  return null as number | null;
}

function inferLocation(text: string) {
  const normalized = text.toLowerCase();
  for (const hint of LOCATION_HINTS) {
    if (hint.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        countryCode: hint.countryCode,
        locationHint: hint.label,
      };
    }
  }
  return null;
}

function hasEventSignal(text: string) {
  const normalized = text.toLowerCase();
  return EVENT_SIGNAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasStrictEventSignal(text: string) {
  const normalized = text.toLowerCase();
  return STRICT_EVENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasNonEventSignal(text: string) {
  const normalized = text.toLowerCase();
  return NON_EVENT_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isRecentSource(publishedMillis: number, nowMillis: number) {
  const oldestMillis = nowMillis - MAX_SOURCE_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000;
  const latestAllowedMillis = nowMillis + 2 * 60 * 60 * 1000;
  return publishedMillis >= oldestMillis && publishedMillis <= latestAllowedMillis;
}

function headlineKey(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepareNewsEntries(entries: RssEntry[], nowMillis: number) {
  const prepared = entries
    .map((entry) => {
      const title = sanitizeHeadline(entry.title);
      const description = sanitizeReadableText(entry.description);
      const sourceTitle = sanitizeReadableText(entry.sourceTitle).slice(0, 120);
      const sourceUrl = entry.sourceUrl?.trim() || '';
      const link = entry.link.trim();
      const location = inferLocation(`${title} ${description} ${sourceTitle}`);
      const publishedMillis = parsePublishedMillis(entry.publishedAt);
      return {
        description,
        link,
        publishedAt: entry.publishedAt,
        sourceTitle,
        sourceUrl,
        title,
        ...(location
          ? {
              countryCode: location.countryCode,
              locationHint: location.locationHint,
            }
          : {}),
        ...(publishedMillis !== null ? { publishedMillis } : {}),
      };
    })
    .filter((entry) => entry.title.length > 0 && entry.link.length > 0)
    .filter((entry) => hasStrictEventSignal(`${entry.title} ${entry.description}`))
    .filter((entry) => !hasNonEventSignal(`${entry.title} ${entry.description} ${entry.link} ${entry.sourceTitle}`))
    .filter((entry) => 'countryCode' in entry && 'locationHint' in entry)
    .filter((entry) => 'publishedMillis' in entry)
    .filter((entry) => isRecentSource((entry as { publishedMillis: number }).publishedMillis, nowMillis))
    .map((entry) => ({
      countryCode: (entry as { countryCode: string }).countryCode,
      description: entry.description,
      link: entry.link,
      locationHint: (entry as { locationHint: string }).locationHint,
      publishedAt: entry.publishedAt,
      publishedMillis: (entry as { publishedMillis: number }).publishedMillis,
      sourceTitle: entry.sourceTitle,
      sourceUrl: entry.sourceUrl || entry.link,
      title: entry.title,
    })) as PreparedNewsEntry[];

  const dedupedByHeadline = new Map<string, PreparedNewsEntry>();
  for (const entry of prepared) {
    const key = `${headlineKey(entry.title)}|${entry.countryCode}`;
    const existing = dedupedByHeadline.get(key);
    if (!existing || entry.publishedMillis > existing.publishedMillis) {
      dedupedByHeadline.set(key, entry);
    }
  }

  return Array.from(dedupedByHeadline.values())
    .sort((left, right) => right.publishedMillis - left.publishedMillis)
    .slice(0, 24);
}

function isAcceptableExistingRow(row: NewsDrivenEventRow) {
  if (!row.country_code || !row.location_hint) {
    return false;
  }

  const text = `${row.headline} ${row.summary} ${row.source_url} ${row.source_title ?? ''}`.toLowerCase();
  if (hasNonEventSignal(text)) {
    return false;
  }

  return hasStrictEventSignal(text);
}

function guessCategory(text: string): NewsScriptCandidate['category'] {
  const corpus = text.toLowerCase();
  if (corpus.includes('war') || corpus.includes('conflict') || corpus.includes('ceasefire')) {
    return 'Peace';
  }
  if (corpus.includes('flood') || corpus.includes('earthquake') || corpus.includes('wildfire') || corpus.includes('storm')) {
    return 'Recovery';
  }
  if (corpus.includes('food') || corpus.includes('famine') || corpus.includes('shelter') || corpus.includes('refugee')) {
    return 'Relief';
  }
  return 'Humanitarian';
}

function buildFallbackScript(title: string, summary: string, category: string) {
  const cleanTitle = sanitizeHeadline(title) || 'Global Support Gathering';
  const cleanSummary = sanitizeReadableText(summary).slice(0, 180);
  const categoryLead = category === 'Peace'
    ? 'peace and protection'
    : category === 'Recovery'
      ? 'steady recovery and rebuilding'
      : category === 'Relief'
        ? 'practical relief and shared care'
        : 'humanitarian support and collective compassion';

  return sanitizeScript(
    `We gather in unity for ${cleanTitle}. We breathe slowly and hold ${categoryLead} in our shared attention.

We set an intention for people and places affected by this situation. May fear soften, may wise action rise, and may every needed hand find a clear path to help.

We ask for strength for families, responders, caregivers, and community leaders. May resources move quickly, may communication stay clear, and may care reach those who need it most.

${cleanSummary ? `We hold this specific context with kindness and focus: ${cleanSummary}.` : 'We hold this moment with humility, practical love, and courage.'}

May this intention move through cities and nations as calm, cooperation, and hope. We close with gratitude, and we carry this care into action.`,
  );
}

function buildDeterministicFallbackCandidates(entries: PreparedNewsEntry[], maxCount: number) {
  const durations: Array<5 | 10 | 15> = [5, 10, 15];
  const selected = entries.slice(0, maxCount);

  return selected.map((entry, index) => {
    const category = guessCategory(`${entry.title} ${entry.description}`);
    const summary = sanitizeReadableText(entry.description).slice(0, 140) ||
      `A guided ${category.toLowerCase()} intention event for global support and shared action.`;
    const titleBase = sanitizeHeadline(entry.title) || `Global ${category} Intention`;
    const title = titleBase.toLowerCase().includes(entry.locationHint.toLowerCase())
      ? titleBase
      : `${titleBase} in ${entry.locationHint}`;

    return {
      category,
      countryCode: entry.countryCode,
      durationMinutes: durations[index % durations.length],
      include: true,
      index,
      locationHint: entry.locationHint,
      script: buildFallbackScript(title, `${summary} in ${entry.locationHint}`, category),
      summary,
      title,
    } satisfies NewsScriptCandidate;
  });
}

async function generateCandidatesWithOpenAI(openai: OpenAI, entries: PreparedNewsEntry[], maxCount: number) {
  if (entries.length === 0 || maxCount <= 0) {
    return [] as NewsScriptCandidate[];
  }

  const compactEntries = entries.slice(0, 20).map((entry, index) => ({
    countryCode: entry.countryCode,
    description: sanitizeReadableText(entry.description).slice(0, 200),
    index,
    link: entry.link,
    locationHint: entry.locationHint,
    publishedAt: entry.publishedAt,
    source: sanitizeReadableText(entry.sourceTitle).slice(0, 80),
    title: sanitizeHeadline(entry.title),
  }));

  const response = await openai.responses.create({
    input: [
      {
        role: 'system',
        content:
          'You convert humanitarian news into short guided intention events. Return clean JSON only. Titles and scripts must be spoken clearly by text to speech. Do not include urls, source names, metadata, markdown, or hashtags. Use complete grammar. Only include real breaking/current events from the source input. Do not invent details.',
      },
      {
        role: 'user',
        content: `From this JSON input, select at most ${maxCount} items that fit manifestation or intention gatherings for global prayer support.\nInput: ${JSON.stringify(
          compactEntries,
        )}\n\nReturn JSON array items with fields: index, include, title, summary, script, category, durationMinutes.\nRules:\n- category must be one of: Humanitarian, Peace, Recovery, Relief\n- durationMinutes must be 5, 10, or 15\n- summary max 140 chars\n- script should be 120 to 220 words, smooth for voice narration\n- include=false for items that do not fit\n- include the source locationHint in title and summary exactly as given\n- do not invent locations or facts not present in source text\n- no URLs or metadata in title/summary/script`,
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

function countOpenSlotsWithinHorizon(now: Date, existingByDay: Map<string, number>) {
  let remaining = 0;

  for (let dayOffset = 0; dayOffset < MAX_RETURN_DAYS; dayOffset += 1) {
    const day = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + dayOffset,
      0,
      0,
      0,
    ));
    const dayKey = toUtcDateString(day);
    const used = existingByDay.get(dayKey) ?? 0;
    remaining += Math.max(0, MAX_NEWS_EVENTS_PER_DAY - used);
  }

  return remaining;
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
  const endDate = new Date(now.getTime() + MAX_RETURN_DAYS * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const endIso = endDate.toISOString();

  const { error: cleanupError } = await supabase
    .from('news_driven_events')
    .delete()
    .gte('starts_at', nowIso)
    .lte('starts_at', endIso)
    .or('country_code.is.null,location_hint.is.null');

  if (cleanupError) {
    return new Response(
      JSON.stringify({ error: 'Failed to cleanup invalid news driven events', detail: cleanupError.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('news_driven_events')
    .select('id,source_url,source_title,headline,summary,script_text,category,country_code,location_hint,duration_minutes,starts_at,event_day,created_at')
    .gte('starts_at', nowIso)
    .lte('starts_at', endIso)
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

  const upcomingRowsRaw = ((existingRows ?? []) as NewsDrivenEventRow[]).filter((row) =>
    new Date(row.starts_at).getTime() >= now.getTime(),
  );
  const invalidExistingIds = upcomingRowsRaw.filter((row) => !isAcceptableExistingRow(row)).map((row) => row.id);

  if (invalidExistingIds.length > 0) {
    const { error: cleanupInvalidRowsError } = await supabase
      .from('news_driven_events')
      .delete()
      .in('id', invalidExistingIds);

    if (cleanupInvalidRowsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to remove invalid news driven events', detail: cleanupInvalidRowsError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }
  }

  const upcomingRows = upcomingRowsRaw.filter((row) => isAcceptableExistingRow(row));

  const existingByDay = new Map<string, number>();
  for (const row of upcomingRows) {
    const day = row.event_day;
    existingByDay.set(day, (existingByDay.get(day) ?? 0) + 1);
  }

  const openSlots = countOpenSlotsWithinHorizon(now, existingByDay);
  const neededCount = Math.min(openSlots, MAX_GENERATION_PER_RUN);

  if (neededCount <= 0) {
    return new Response(JSON.stringify({ events: upcomingRows, generated: 0, pulled: 0, reason: 'no-open-slots' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const rssEntries = await fetchRssEntries();
  const gdeltEntries = rssEntries.length === 0 ? await fetchGdeltEntries() : [];
  const aggregatedEntries = [...rssEntries, ...gdeltEntries];
  const relevantEntries = aggregatedEntries.filter(isManifestationRelevant);
  const candidateEntries = relevantEntries.length > 0 ? relevantEntries : aggregatedEntries;
  const preparedEntries = prepareNewsEntries(candidateEntries, now.getTime());

  if (preparedEntries.length === 0) {
    const reusableBySource = new Map<string, NewsDrivenEventRow>();
    for (const row of upcomingRows) {
      if (!row.source_url || reusableBySource.has(row.source_url)) {
        continue;
      }
      reusableBySource.set(row.source_url, row);
    }

    const reusableRows = Array.from(reusableBySource.values())
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
    const recycleCount = Math.min(neededCount, reusableRows.length);

    if (recycleCount <= 0) {
      return new Response(
        JSON.stringify({ events: upcomingRows, generated: 0, pulled: 0, reason: 'no-eligible-news-events' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    const recycleSchedule = nextSlots(now, recycleCount, existingByDay);
    let recycled = 0;

    for (let index = 0; index < recycleCount; index += 1) {
      const row = reusableRows[index];
      const startsAt = recycleSchedule[index];
      if (!row || !startsAt) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const { error: recycleError } = await supabase
        .from('news_driven_events')
        .update({
          event_day: toUtcDateString(startsAt),
          starts_at: startsAt.toISOString(),
        })
        .eq('id', row.id);

      if (!recycleError) {
        recycled += 1;
      }
    }

    const { data: refreshedRowsAfterRecycle, error: refreshedAfterRecycleError } = await supabase
      .from('news_driven_events')
      .select('id,source_url,source_title,headline,summary,script_text,category,country_code,location_hint,duration_minutes,starts_at,event_day,created_at')
      .gte('starts_at', nowIso)
      .lte('starts_at', endIso)
      .order('starts_at', { ascending: true });

    if (refreshedAfterRecycleError) {
      return new Response(
        JSON.stringify({ error: 'Failed to load recycled news driven events', detail: refreshedAfterRecycleError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    return new Response(
      JSON.stringify({
        events: refreshedRowsAfterRecycle ?? [],
        generated: 0,
        pulled: 0,
        recycled,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }

  const openai = new OpenAI({ apiKey: openAiApiKey });

  let candidates: NewsScriptCandidate[] = [];
  try {
    candidates = await generateCandidatesWithOpenAI(openai, preparedEntries, neededCount);
  } catch (error) {
    candidates = [];
  }

  if (candidates.length === 0) {
    candidates = buildDeterministicFallbackCandidates(preparedEntries, neededCount);
  }

  const selectedIncluded = candidates.filter((item) => item.include);
  const selectedBase = selectedIncluded.length > 0 ? selectedIncluded : candidates;
  const selected = selectedBase.slice(0, neededCount);
  if (selected.length === 0) {
    const fallbackSelected = buildDeterministicFallbackCandidates(preparedEntries, neededCount);
    if (fallbackSelected.length === 0) {
      return new Response(JSON.stringify({ events: upcomingRows, generated: 0, pulled: preparedEntries.length, reason: 'no-candidates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    candidates = fallbackSelected;
  }

  const activeCandidates = (selected.length > 0 ? selected : candidates).slice(0, neededCount);
  const schedule = nextSlots(now, activeCandidates.length, existingByDay);

  const toInsert = activeCandidates
    .map((candidate, index) => {
      const source = preparedEntries[candidate.index];
      const startsAt = schedule[index];
      if (!source || !startsAt) {
        return null;
      }

      const eventDay = toUtcDateString(startsAt);
      const locationHint = candidate.locationHint?.trim() || source.locationHint;
      const titleBase = sanitizeHeadline(candidate.title || source.title);
      const summaryBase = sanitizeReadableText(candidate.summary).slice(0, 160);
      const headline =
        locationHint && !titleBase.toLowerCase().includes(locationHint.toLowerCase())
          ? sanitizeHeadline(`${titleBase} in ${locationHint}`)
          : titleBase;
      const summary =
        locationHint && !summaryBase.toLowerCase().includes(locationHint.toLowerCase())
          ? sanitizeReadableText(`${summaryBase} in ${locationHint}`).slice(0, 160)
          : summaryBase;

      return {
        category: candidate.category || 'Humanitarian',
        country_code: candidate.countryCode || source.countryCode,
        duration_minutes: candidate.durationMinutes,
        event_day: eventDay,
        headline,
        location_hint: locationHint,
        script_text: sanitizeScript(candidate.script),
        source_title: sanitizeReadableText(source.sourceTitle).slice(0, 120) || null,
        source_url: source.link,
        starts_at: startsAt.toISOString(),
        summary,
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
    .select('id,source_url,source_title,headline,summary,script_text,category,country_code,location_hint,duration_minutes,starts_at,event_day,created_at')
    .gte('starts_at', nowIso)
    .lte('starts_at', endIso)
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
      pulled: preparedEntries.length,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
});
