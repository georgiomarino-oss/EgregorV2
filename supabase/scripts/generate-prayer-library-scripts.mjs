#!/usr/bin/env node

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DURATIONS = [3, 5, 10];
const TARGET_WORDS_BY_DURATION = {
  3: 390,
  5: 650,
  10: 1250,
};
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const LANGUAGE = 'en';
const PRAYER_TONE = 'grounded, compassionate, and hopeful';
const HYPHEN_LIKE_PATTERN = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;
const SECTION_HEADING_PATTERN = /^(grounding|prayer|closing|opening|reflection)\s*:?$/i;
const CATALOG_RELATIVE_PATH = ['supabase', 'scripts', 'prayer-catalog.json'];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
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

function loadPrayerCatalog(rootDir) {
  const catalogPath = path.join(rootDir, ...CATALOG_RELATIVE_PATH);
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Prayer catalog missing at ${catalogPath}.`);
  }

  const raw = fs.readFileSync(catalogPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Prayer catalog must be a non-empty array.');
  }

  const seen = new Set();
  const prayers = [];

  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Prayer catalog row ${index + 1} is invalid.`);
    }

    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const category = typeof entry.category === 'string' ? entry.category.trim() : '';
    const body = typeof entry.body === 'string' ? entry.body.trim() : '';

    if (!title || !category || !body) {
      throw new Error(`Prayer catalog row ${index + 1} is missing title, category, or body.`);
    }

    const identity = prayerIdentity(title, category);
    if (seen.has(identity)) {
      throw new Error(`Duplicate prayer catalog entry detected: ${title} (${category}).`);
    }

    seen.add(identity);
    prayers.push({ title, category, body });
  });

  return prayers;
}

function normalizeKey(value) {
  return value.trim().toLowerCase();
}

function prayerIdentity(title, category) {
  return `${normalizeKey(title)}::${normalizeKey(category ?? '')}`;
}

function sentenceKey(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(HYPHEN_LIKE_PATTERN, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceSignatures(scriptText, maxCount = 3) {
  if (!scriptText?.trim()) {
    return [];
  }

  return scriptText
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentenceKey(sentence))
    .filter((sentence) => sentence.length > 0)
    .slice(0, maxCount)
    .map((sentence) => sentence.split(/\s+/).slice(0, 14).join(' '));
}

function ngramSignatures(scriptText, n = 7) {
  if (!scriptText?.trim()) {
    return new Set();
  }

  const words = sentenceKey(scriptText).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return new Set();
  }

  if (words.length <= n) {
    return new Set([words.join(' ')]);
  }

  const signatures = new Set();
  for (let index = 0; index <= words.length - n; index += 1) {
    signatures.add(words.slice(index, index + n).join(' '));
  }

  return signatures;
}

function jaccardSimilarity(setA, setB) {
  if (!(setA instanceof Set) || !(setB instanceof Set) || setA.size === 0 || setB.size === 0) {
    return 0;
  }

  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let intersection = 0;

  for (const token of smaller) {
    if (larger.has(token)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function countWords(text) {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}

function sanitizeLineForSpeech(line) {
  let cleaned = line.normalize('NFKC').replace(/\t/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  cleaned = cleaned.replace(/^#{1,6}\s+/, '');
  cleaned = cleaned.replace(/^([-*\u2022\u25CF\u25E6\u25AA\u25AB]|\d+[.)])\s+/, '');

  if (SECTION_HEADING_PATTERN.test(cleaned)) {
    return '';
  }

  cleaned = cleaned.replace(/[*_`~>|]/g, '');
  cleaned = cleaned.replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, '$1 and $2');
  cleaned = cleaned.replace(HYPHEN_LIKE_PATTERN, ' ');
  cleaned = cleaned.replace(/\s*-\s*/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\s+([,.;!?])/g, '$1');
  cleaned = cleaned.replace(/([,.;!?])\1+/g, '$1');

  return cleaned.trim();
}

function sanitizeScriptForSpeech(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const paragraphs = [];
  let currentParagraph = [];

  for (const line of lines) {
    const cleaned = sanitizeLineForSpeech(line);
    if (!cleaned) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' ').trim());
        currentParagraph = [];
      }
      continue;
    }

    currentParagraph.push(cleaned);
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' ').trim());
  }

  const normalizedParagraphs = paragraphs
    .map((paragraph) => {
      const collapsed = paragraph.replace(/\s+/g, ' ').trim();
      if (!collapsed) {
        return '';
      }

      return /[.?!]$/.test(collapsed) ? collapsed : `${collapsed}.`;
    })
    .filter(Boolean);

  return normalizedParagraphs.join('\n\n').trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      `Request failed (${response.status} ${response.statusText}) for ${url}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
    );
  }

  return data;
}

function getProjectRef(rootDir) {
  const refPath = path.join(rootDir, 'supabase', '.temp', 'project-ref');
  if (!fs.existsSync(refPath)) {
    throw new Error('Missing supabase/.temp/project-ref. Run `supabase link` first.');
  }

  const projectRef = fs.readFileSync(refPath, 'utf8').trim();
  if (!projectRef) {
    throw new Error('project-ref file is empty.');
  }

  return projectRef;
}

function getServiceRoleKey(projectRef) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const raw = execSync(`supabase projects api-keys --project-ref ${projectRef}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const serviceRoleMatch = raw.match(/^\s*service_role\s*\|\s*(.+?)\s*$/m);
  if (!serviceRoleMatch?.[1]) {
    throw new Error(
      'Could not resolve service_role key from Supabase CLI. Set SUPABASE_SERVICE_ROLE_KEY env var and rerun.',
    );
  }

  return serviceRoleMatch[1].trim();
}

async function supabaseRestRequest({
  body,
  headers = {},
  method = 'GET',
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
    init.headers['Content-Type'] = 'application/json';
  }

  return requestJson(url, init);
}

async function ensureSeedUser({ serviceRoleKey, supabaseUrl }) {
  const users = await requestJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    method: 'GET',
  });

  const existingUser = Array.isArray(users?.users) ? users.users[0] : null;
  if (existingUser?.id) {
    return existingUser.id;
  }

  const email = 'seed-prayers@egregor.world';
  const password = crypto.randomBytes(24).toString('base64url');

  const created = await requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
    body: JSON.stringify({
      email,
      email_confirm: true,
      password,
      user_metadata: { display_name: 'Egregor Seed' },
    }),
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!created?.id) {
    throw new Error('Failed to create seed user.');
  }

  return created.id;
}

async function ensureSeedProfile({ serviceRoleKey, seedUserId, supabaseUrl }) {
  await supabaseRestRequest({
    body: { id: seedUserId },
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    method: 'POST',
    pathWithQuery: '/rest/v1/profiles?on_conflict=id',
    serviceRoleKey,
    supabaseUrl,
  });
}

async function ensurePrayerLibraryItems({ prayers, serviceRoleKey, seedUserId, supabaseUrl }) {
  const existingRows = await supabaseRestRequest({
    pathWithQuery:
      '/rest/v1/prayer_library_items?select=id,title,category,body,duration_minutes,is_public,created_by&order=created_at.asc',
    serviceRoleKey,
    supabaseUrl,
  });

  const existingByKey = new Map();
  for (const row of existingRows) {
    existingByKey.set(prayerIdentity(row.title, row.category ?? ''), row);
  }

  for (const prayer of prayers) {
    const key = prayerIdentity(prayer.title, prayer.category);
    const existing = existingByKey.get(key);

    if (existing) {
      const needsUpdate =
        existing.body !== prayer.body ||
        existing.duration_minutes !== 5 ||
        existing.is_public !== true;

      if (needsUpdate) {
        await supabaseRestRequest({
          body: {
            body: prayer.body,
            duration_minutes: 5,
            is_public: true,
          },
          headers: { Prefer: 'return=minimal' },
          method: 'PATCH',
          pathWithQuery: `/rest/v1/prayer_library_items?id=eq.${existing.id}`,
          serviceRoleKey,
          supabaseUrl,
        });
      }

      continue;
    }

    const inserted = await supabaseRestRequest({
      body: {
        body: prayer.body,
        category: prayer.category,
        created_by: seedUserId,
        duration_minutes: 5,
        is_public: true,
        title: prayer.title,
      },
      headers: { Prefer: 'return=representation' },
      method: 'POST',
      pathWithQuery: '/rest/v1/prayer_library_items',
      serviceRoleKey,
      supabaseUrl,
    });

    const insertedRow = Array.isArray(inserted) ? inserted[0] : inserted;
    if (insertedRow?.id) {
      existingByKey.set(key, insertedRow);
    }
  }

  const refreshed = await supabaseRestRequest({
    pathWithQuery:
      '/rest/v1/prayer_library_items?select=id,title,category,body,is_public&order=created_at.asc',
    serviceRoleKey,
    supabaseUrl,
  });

  return refreshed.filter((row) => {
    const key = prayerIdentity(row.title, row.category ?? '');
    return prayers.some((prayer) => prayerIdentity(prayer.title, prayer.category) === key);
  });
}

async function generateScriptWithRetry({
  attempt = 1,
  forbiddenSentences = [],
  globalHints = [],
  openAiApiKey,
  prayer,
  priorDurations,
  targetDuration,
}) {
  const targetWords = TARGET_WORDS_BY_DURATION[targetDuration];
  const openingHints =
    priorDurations.length > 0
      ? priorDurations
          .map((entry) => `${entry.duration} minute opening: ${entry.preview}`)
          .join('\n')
      : 'No prior scripts for this prayer in this run.';
  const crossPrayerHints =
    globalHints.length > 0
      ? globalHints.map((hint, index) => `${index + 1}. ${hint}`).join('\n')
      : 'No cross-prayer opening constraints.';
  const forbiddenSentenceHints =
    forbiddenSentences.length > 0
      ? forbiddenSentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n')
      : 'None.';

  const prompt = [
    `Write a spiritually grounded prayer script for "${prayer.title}" in the "${prayer.category}" category.`,
    `Prayer intention details: ${prayer.body}`,
    `Target spoken length: ${targetDuration} minutes.`,
    `Target word count: about ${targetWords} words (acceptable range plus or minus 10 percent).`,
    'Requirements:',
    `Tone must be ${PRAYER_TONE}.`,
    'Use contemporary language suitable for a broad spiritual audience.',
    'Make this script unique and non-repetitive.',
    'Use complete sentences with correct grammar and punctuation.',
    'Avoid reusing sentence structures, repeated openings, and repeated refrain lines.',
    'Keep flow natural for spoken audio pacing.',
    'Do not use bullet points, numbered lists, markdown, section labels, or hyphen-based list formatting.',
    'Return plain spoken prose only.',
    'Previously generated scripts for this same prayer (avoid these openings and repeated phrases):',
    openingHints,
    'Recent opening style hints from other prayers (do not mirror these openings):',
    crossPrayerHints,
    'Forbidden opening sentence signatures (must not appear):',
    forbiddenSentenceHints,
  ].join('\n');

  try {
    const response = await requestJson('https://api.openai.com/v1/responses', {
      body: JSON.stringify({
        input: [
          {
            content:
              'You write high-quality spoken prayer scripts. Output must be original, emotionally precise, grammatically correct, and formatted as clean prose suitable for text to speech.',
            role: 'system',
          },
          {
            content: prompt,
            role: 'user',
          },
        ],
        max_output_tokens: targetDuration === 10 ? 3400 : targetDuration === 5 ? 2000 : 1200,
        model: OPENAI_MODEL,
        temperature: 0.95,
      }),
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const script = extractResponseText(response);
    if (!script) {
      throw new Error('OpenAI returned no readable text output.');
    }

    const sanitizedScript = sanitizeScriptForSpeech(script);
    if (!sanitizedScript) {
      throw new Error('OpenAI output was empty after sanitization.');
    }

    return sanitizedScript;
  } catch (error) {
    if (attempt >= 3) {
      throw error;
    }

    await sleep(attempt * 1000);
    return generateScriptWithRetry({
      attempt: attempt + 1,
      forbiddenSentences,
      globalHints,
      openAiApiKey,
      prayer,
      priorDurations,
      targetDuration,
    });
  }
}
function extractResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response?.output) ? response.output : [];
  const textChunks = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim().length > 0) {
        textChunks.push(part.text.trim());
      } else if (typeof part?.output_text === 'string' && part.output_text.trim().length > 0) {
        textChunks.push(part.output_text.trim());
      }
    }
  }

  if (textChunks.length === 0) {
    return '';
  }

  return textChunks.join('\n\n').trim();
}

async function upsertPrayerScript({
  durationMinutes,
  model,
  prayerLibraryItemId,
  scriptText,
  serviceRoleKey,
  supabaseUrl,
}) {
  const sanitizedScript = sanitizeScriptForSpeech(scriptText);
  const wordCount = countWords(sanitizedScript);

  await supabaseRestRequest({
    body: {
      duration_minutes: durationMinutes,
      language: LANGUAGE,
      model,
      prayer_library_item_id: prayerLibraryItemId,
      script_text: sanitizedScript,
      tone: PRAYER_TONE,
      word_count: wordCount,
    },
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    method: 'POST',
    pathWithQuery:
      '/rest/v1/prayer_library_scripts?on_conflict=prayer_library_item_id,duration_minutes,language',
    serviceRoleKey,
    supabaseUrl,
  });
}

function scriptVariantKey(prayerLibraryItemId, durationMinutes, language = LANGUAGE) {
  return `${prayerLibraryItemId}|${durationMinutes}|${language}`;
}

async function listPrayerScripts({ serviceRoleKey, supabaseUrl }) {
  const pageSize = 500;
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRestRequest({
      pathWithQuery: `/rest/v1/prayer_library_scripts?select=id,prayer_library_item_id,duration_minutes,language,script_text&order=updated_at.desc&limit=${pageSize}&offset=${offset}`,
      serviceRoleKey,
      supabaseUrl,
    });

    if (!Array.isArray(page) || page.length === 0) {
      break;
    }

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function generateUniqueScriptVariant({
  ngramSignatureSets,
  openAiApiKey,
  prayer,
  priorDurations,
  sentenceSignatureSet,
  targetDuration,
}) {
  const maxUniqueAttempts = 5;
  const recentSignatureHints = Array.from(sentenceSignatureSet).slice(-24);
  const globalHints = recentSignatureHints.slice(0, 12);

  for (let attempt = 1; attempt <= maxUniqueAttempts; attempt += 1) {
    const scriptText = await generateScriptWithRetry({
      forbiddenSentences: recentSignatureHints,
      globalHints,
      openAiApiKey,
      prayer,
      priorDurations,
      targetDuration,
    });

    const signatures = sentenceSignatures(scriptText, 3);
    const ngrams = ngramSignatures(scriptText, 7);
    const hasCollision = signatures.some((signature) => sentenceSignatureSet.has(signature));
    const hasNgramOverlap = ngramSignatureSets.some(
      (referenceSet) => jaccardSimilarity(ngrams, referenceSet) >= 0.12,
    );

    if ((!hasCollision && !hasNgramOverlap) || (signatures.length === 0 && !hasNgramOverlap)) {
      signatures.forEach((signature) => sentenceSignatureSet.add(signature));
      ngramSignatureSets.push(ngrams);
      return scriptText;
    }
  }

  throw new Error(
    `Could not generate a unique script for "${prayer.title}" (${targetDuration} min) after ${maxUniqueAttempts} attempts.`,
  );
}

async function main() {
  const rootDir = path.resolve(path.dirname(process.argv[1]), '..', '..');
  const supabaseEnvPath = path.join(rootDir, 'supabase', '.env');
  const env = readEnvFile(supabaseEnvPath);
  const prayers = loadPrayerCatalog(rootDir);

  const openAiApiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is missing. Set it in supabase/.env or export OPENAI_API_KEY before running.',
    );
  }

  const projectRef = getProjectRef(rootDir);
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const serviceRoleKey = getServiceRoleKey(projectRef);

  console.log(`Using project ${projectRef}.`);
  console.log('Ensuring seed user/profile...');

  const seedUserId = await ensureSeedUser({ serviceRoleKey, supabaseUrl });
  await ensureSeedProfile({ seedUserId, serviceRoleKey, supabaseUrl });

  console.log(`Ensuring prayer_library_items entries from catalog (${prayers.length} prayers)...`);
  const items = await ensurePrayerLibraryItems({ prayers, serviceRoleKey, seedUserId, supabaseUrl });

  const targetItems = items
    .map((item) => ({
      body: item.body,
      category: item.category ?? '',
      id: item.id,
      title: item.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const existingScriptRows = await listPrayerScripts({ serviceRoleKey, supabaseUrl });
  const existingByVariant = new Map();
  const sentenceSignatureSet = new Set();
  const ngramSignatureSets = [];

  for (const row of existingScriptRows) {
    const itemId =
      typeof row.prayer_library_item_id === 'string' ? row.prayer_library_item_id.trim() : '';
    const durationMinutes = Number(row.duration_minutes);
    const language = typeof row.language === 'string' ? row.language.trim() : '';
    const scriptText = typeof row.script_text === 'string' ? row.script_text.trim() : '';

    if (!itemId || !Number.isFinite(durationMinutes) || !language || !scriptText) {
      continue;
    }

    existingByVariant.set(scriptVariantKey(itemId, durationMinutes, language), scriptText);
    sentenceSignatures(scriptText, 3).forEach((signature) => sentenceSignatureSet.add(signature));
    ngramSignatureSets.push(ngramSignatures(scriptText, 7));
  }

  const total = targetItems.length * DURATIONS.length;
  const existingVariants = targetItems.reduce((acc, prayer) => {
    return (
      acc +
      DURATIONS.filter((duration) =>
        existingByVariant.has(scriptVariantKey(prayer.id, duration, LANGUAGE)),
      ).length
    );
  }, 0);

  console.log(
    `Preparing scripts for ${targetItems.length} prayers x ${DURATIONS.length} durations (${total} variants). Existing variants found: ${existingVariants}.`,
  );

  let completed = 0;
  let generated = 0;
  let skipped = 0;

  for (const prayer of targetItems) {
    const priorDurations = [];

    for (const duration of DURATIONS) {
      const variantKey = scriptVariantKey(prayer.id, duration, LANGUAGE);
      const existingScript = existingByVariant.get(variantKey);

      if (existingScript) {
        priorDurations.push({
          duration,
          preview: existingScript.slice(0, 160).replace(/\s+/g, ' ').trim(),
        });
        completed += 1;
        skipped += 1;
        console.log(`[${completed}/${total}] ${prayer.title} (${duration} min) already exists, skipped.`);
        continue;
      }

      const scriptText = await generateUniqueScriptVariant({
        ngramSignatureSets,
        openAiApiKey,
        prayer,
        priorDurations,
        sentenceSignatureSet,
        targetDuration: duration,
      });

      await upsertPrayerScript({
        durationMinutes: duration,
        model: OPENAI_MODEL,
        prayerLibraryItemId: prayer.id,
        scriptText,
        serviceRoleKey,
        supabaseUrl,
      });
      existingByVariant.set(variantKey, scriptText);

      priorDurations.push({
        duration,
        preview: scriptText.slice(0, 160).replace(/\s+/g, ' ').trim(),
      });

      completed += 1;
      generated += 1;
      console.log(`[${completed}/${total}] ${prayer.title} (${duration} min) saved.`);
      await sleep(300);
    }
  }

  const savedRows = await supabaseRestRequest({
    pathWithQuery: '/rest/v1/prayer_library_scripts?select=id&language=eq.en',
    serviceRoleKey,
    supabaseUrl,
  });

  console.log(`Done. Generated ${generated}, skipped ${skipped}. Total stored script variants (en): ${savedRows.length}.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Script generation failed: ${message}`);
  process.exit(1);
});
