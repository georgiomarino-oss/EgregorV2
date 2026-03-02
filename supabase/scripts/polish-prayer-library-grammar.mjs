#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const PAGE_SIZE = 500;
const REQUEST_DELAY_MS = 250;
const HYPHEN_LIKE_PATTERN = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;
const SECTION_HEADING_PATTERN = /^(grounding|prayer|closing|opening|reflection)\s*:?$/i;

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

function getServiceRoleKey(projectRef, env) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    return env.SUPABASE_SERVICE_ROLE_KEY;
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

function sanitizeLineForSpeech(line) {
  let cleaned = line.normalize('NFKC').replace(/\t/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  cleaned = cleaned.replace(/^#{1,6}\s+/, '');
  cleaned = cleaned.replace(/^(\*\*|__)+\s*/, '').replace(/\s*(\*\*|__)+$/, '');
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

async function supabaseRestRequest({ body, headers = {}, method = 'GET', pathWithQuery, serviceRoleKey, supabaseUrl }) {
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

async function listAllScripts({ serviceRoleKey, supabaseUrl }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRestRequest({
      pathWithQuery: `/rest/v1/prayer_library_scripts?select=id,duration_minutes,script_text,word_count&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`,
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

async function polishScriptWithRetry({ attempt = 1, durationMinutes, openAiApiKey, scriptText }) {
  const prompt = [
    'Rewrite the following prayer script into polished spoken prose with strong grammatical accuracy.',
    'Preserve original meaning, tone, and approximate length.',
    'Rewrite awkward or incomplete phrasing so each paragraph reads naturally aloud.',
    'Every paragraph must contain complete sentences and end with final punctuation.',
    'Fix comma usage, sentence boundaries, and transitions so every sentence sounds fluent when spoken aloud.',
    'Do not add headings, bullets, markdown, or list markers.',
    'Do not use hyphens or dashes in the final output.',
    'Return plain text only.',
    `Target duration: ${durationMinutes} minutes.`,
    'Script to edit:',
    scriptText,
  ].join('\n\n');

  try {
    const response = await requestJson('https://api.openai.com/v1/responses', {
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        max_output_tokens: 3600,
        input: [
          {
            role: 'system',
            content:
              'You are a meticulous copy editor for spoken prayer narration. Produce grammatically correct prose with smooth, natural spoken rhythm. Complete any incomplete sentence fragments while preserving intent and emotional tone.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const edited = extractResponseText(response);
    if (!edited) {
      throw new Error('OpenAI returned empty edited content.');
    }

    const sanitized = sanitizeScriptForSpeech(edited);
    if (!sanitized) {
      throw new Error('Edited script was empty after sanitization.');
    }

    return sanitized;
  } catch (error) {
    if (attempt >= 3) {
      throw error;
    }

    await sleep(attempt * 1000);
    return polishScriptWithRetry({
      attempt: attempt + 1,
      durationMinutes,
      openAiApiKey,
      scriptText,
    });
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rootDir = path.resolve(path.dirname(process.argv[1]), '..', '..');
  const env = readEnvFile(path.join(rootDir, 'supabase', '.env'));

  const openAiApiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is missing. Set it in supabase/.env or export OPENAI_API_KEY before running.');
  }

  const projectRef = getProjectRef(rootDir);
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const serviceRoleKey = getServiceRoleKey(projectRef, env);

  const rows = await listAllScripts({ serviceRoleKey, supabaseUrl });
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const original = typeof row.script_text === 'string' ? row.script_text.trim() : '';
    if (!original) {
      unchanged += 1;
      continue;
    }

    const polished = await polishScriptWithRetry({
      durationMinutes: row.duration_minutes,
      openAiApiKey,
      scriptText: original,
    });

    const wordCount = countWords(polished);
    const hasChanges = polished !== original || Number(row.word_count ?? 0) !== wordCount;

    if (!hasChanges) {
      unchanged += 1;
      continue;
    }

    updated += 1;

    if (!dryRun) {
      await supabaseRestRequest({
        body: {
          script_text: polished,
          word_count: wordCount,
        },
        headers: { Prefer: 'return=minimal' },
        method: 'PATCH',
        pathWithQuery: `/rest/v1/prayer_library_scripts?id=eq.${row.id}`,
        serviceRoleKey,
        supabaseUrl,
      });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Scanned ${rows.length} script rows.`);
  console.log(`${dryRun ? 'Would update' : 'Updated'} ${updated} row(s).`);
  console.log(`Unchanged ${unchanged} row(s).`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Grammar polish failed: ${message}`);
  process.exit(1);
});
