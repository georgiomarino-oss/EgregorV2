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

const PRAYERS = [
  {
    body: 'Guide this bond with patience, trust, and healthy communication that strengthens connection.',
    category: 'Relationships',
    title: 'Prayer for Family Unity',
  },
  {
    body: 'Bring peace to conversations and clarity to unresolved moments so healing can continue.',
    category: 'Relationships',
    title: 'Prayer for Reconciliation',
  },
  {
    body: 'Anchor the mind, steady the breath, and restore calm energy for the day ahead.',
    category: 'Wellbeing',
    title: 'Prayer for Inner Calm',
  },
  {
    body: 'Support healthy routines, deep rest, and resilience through every challenge.',
    category: 'Wellbeing',
    title: 'Prayer for Rest and Renewal',
  },
  {
    body: 'Open pathways for provision, wise decisions, and meaningful opportunities.',
    category: 'Abundance',
    title: 'Prayer for Provision',
  },
  {
    body: 'Align resources with purpose and invite generosity, discipline, and gratitude.',
    category: 'Abundance',
    title: 'Prayer for Responsible Growth',
  },
  {
    body: 'Clarify priorities and reveal the next right step with courage and consistency.',
    category: 'Purpose',
    title: 'Prayer for Clear Purpose',
  },
  {
    body: 'Strengthen conviction and serve with humility in every mission you are called to.',
    category: 'Purpose',
    title: 'Prayer for Meaningful Work',
  },
  {
    body: 'Cover your home and loved ones with safety, wisdom, and steady protection.',
    category: 'Protection',
    title: 'Prayer for Household Protection',
  },
  {
    body: 'Guard each journey with attentiveness, safe passage, and peaceful arrival.',
    category: 'Protection',
    title: 'Prayer for Safe Travel',
  },
  {
    body: 'Center the heart in gratitude for daily gifts, lessons, and faithful support.',
    category: 'Gratitude',
    title: 'Prayer of Daily Gratitude',
  },
  {
    body: 'Reflect with humility, celebrate progress, and carry gratitude into tomorrow.',
    category: 'Gratitude',
    title: 'Prayer for Evening Reflection',
  },
];

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

function normalizeKey(value) {
  return value.trim().toLowerCase();
}

function prayerIdentity(title, category) {
  return `${normalizeKey(title)}::${normalizeKey(category ?? '')}`;
}

function countWords(text) {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
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

async function ensurePrayerLibraryItems({ serviceRoleKey, seedUserId, supabaseUrl }) {
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

  for (const prayer of PRAYERS) {
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
    return PRAYERS.some((prayer) => prayerIdentity(prayer.title, prayer.category) === key);
  });
}

async function generateScriptWithRetry({
  attempt = 1,
  openAiApiKey,
  prayer,
  priorDurations,
  targetDuration,
}) {
  const targetWords = TARGET_WORDS_BY_DURATION[targetDuration];
  const openingHints =
    priorDurations.length > 0
      ? priorDurations
          .map((entry) => `- ${entry.duration} min opening: ${entry.preview}`)
          .join('\n')
      : '- No prior scripts for this prayer in this run.';

  const prompt = [
    `Write a spiritually grounded prayer script for "${prayer.title}" in the "${prayer.category}" category.`,
    `Prayer intention details: ${prayer.body}`,
    `Target spoken length: ${targetDuration} minutes.`,
    `Target word count: about ${targetWords} words (acceptable range ±10%).`,
    'Requirements:',
    `- Tone must be ${PRAYER_TONE}.`,
    '- Use contemporary language suitable for a broad spiritual audience.',
    '- Make this script unique and non-repetitive.',
    '- Avoid reusing sentence structures, repeated openings, and repeated refrain lines.',
    '- Use three sections with simple headings: Grounding, Prayer, Closing.',
    '- Keep flow natural for spoken audio pacing.',
    '- Return plain text only.',
    'Previously generated scripts for this same prayer (avoid these openings and repeated phrases):',
    openingHints,
  ].join('\n');

  try {
    const response = await requestJson('https://api.openai.com/v1/responses', {
      body: JSON.stringify({
        input: [
          {
            content:
              'You write high-quality spoken prayer scripts. Output must be original, emotionally precise, and free from repetitive wording.',
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

    return script;
  } catch (error) {
    if (attempt >= 3) {
      throw error;
    }

    await sleep(attempt * 1000);
    return generateScriptWithRetry({
      attempt: attempt + 1,
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
  const wordCount = countWords(scriptText);

  await supabaseRestRequest({
    body: {
      duration_minutes: durationMinutes,
      language: LANGUAGE,
      model,
      prayer_library_item_id: prayerLibraryItemId,
      script_text: scriptText,
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

async function main() {
  const rootDir = path.resolve(path.dirname(process.argv[1]), '..', '..');
  const supabaseEnvPath = path.join(rootDir, 'supabase', '.env');
  const env = readEnvFile(supabaseEnvPath);

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

  console.log('Ensuring prayer_library_items entries...');
  const items = await ensurePrayerLibraryItems({ serviceRoleKey, seedUserId, supabaseUrl });

  const targetItems = items
    .map((item) => ({
      body: item.body,
      category: item.category ?? '',
      id: item.id,
      title: item.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  console.log(`Generating scripts for ${targetItems.length} prayers x ${DURATIONS.length} durations...`);

  let completed = 0;
  const total = targetItems.length * DURATIONS.length;

  for (const prayer of targetItems) {
    const priorDurations = [];

    for (const duration of DURATIONS) {
      const scriptText = await generateScriptWithRetry({
        openAiApiKey,
        prayer,
        priorDurations,
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

      priorDurations.push({
        duration,
        preview: scriptText.slice(0, 160).replace(/\s+/g, ' ').trim(),
      });

      completed += 1;
      console.log(`[${completed}/${total}] ${prayer.title} (${duration} min) saved.`);
      await sleep(300);
    }
  }

  const savedRows = await supabaseRestRequest({
    pathWithQuery: '/rest/v1/prayer_library_scripts?select=id&language=eq.en',
    serviceRoleKey,
    supabaseUrl,
  });

  console.log(`Done. Total stored script variants (en): ${savedRows.length}.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Script generation failed: ${message}`);
  process.exit(1);
});
