#!/usr/bin/env node

/* global AbortController, clearTimeout, console, fetch, setTimeout */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CONFIG = 'lottie-assets.config.json';
const DEFAULT_TIMEOUT_MS = 20000;

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

function getArgValue(flagName) {
  const prefix = `${flagName}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function parseArgs() {
  const isCheck = process.argv.includes('--check');
  const isDryRun = process.argv.includes('--dry-run');
  const isStrict = process.argv.includes('--strict');
  const idArg = getArgValue('--id');
  const configArg = getArgValue('--config');
  const ids = idArg
    ? new Set(
        idArg
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;

  return {
    configPath: configArg || DEFAULT_CONFIG,
    ids,
    isCheck,
    isDryRun,
    isStrict,
  };
}

function toTimeoutMs(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(parsed);
}

function resolveSourceUrl(asset, env) {
  if (asset.sourceUrlEnv) {
    const fromEnv = env[asset.sourceUrlEnv] || process.env[asset.sourceUrlEnv];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      return fromEnv.trim();
    }
  }

  if (typeof asset.sourceUrl === 'string' && asset.sourceUrl.trim().length > 0) {
    return asset.sourceUrl.trim();
  }

  return '';
}

function getToken(env) {
  const fromRuntime = process.env.LOTTIE_API_TOKEN;
  if (typeof fromRuntime === 'string' && fromRuntime.trim()) {
    return fromRuntime.trim();
  }

  const fromFile = env.LOTTIE_API_TOKEN;
  if (typeof fromFile === 'string' && fromFile.trim()) {
    return fromFile.trim();
  }

  return '';
}

function getHeaders(asset, token) {
  const headers = {
    Accept: 'application/json',
  };

  if (asset.requiresAuth) {
    if (!token) {
      throw new Error(
        `Asset "${asset.id}" requires auth but LOTTIE_API_TOKEN is missing.`,
      );
    }

    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  return headers;
}

async function fetchJson({ headers, timeoutMs, url }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      method: 'GET',
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} for ${url}: ${text.slice(0, 300)}`,
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Response is not valid JSON for ${url}.`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`JSON payload is invalid for ${url}.`);
    }

    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureRelativeOutput(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Asset output path is required.');
  }

  const normalized = value.replace(/\\/g, '/').trim();
  if (normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error(`Invalid output path "${value}". Use a repo-relative path.`);
  }

  return normalized;
}

async function main() {
  const rootDir = path.resolve(path.dirname(process.argv[1]), '..');
  const env = readEnvFile(path.join(rootDir, '.env'));
  const { configPath, ids, isCheck, isDryRun, isStrict } = parseArgs();

  const absoluteConfigPath = path.resolve(rootDir, configPath);
  if (!fs.existsSync(absoluteConfigPath)) {
    throw new Error(`Config file not found: ${absoluteConfigPath}`);
  }

  const configRaw = fs.readFileSync(absoluteConfigPath, 'utf8');
  const config = JSON.parse(configRaw);
  const assets = Array.isArray(config.assets) ? config.assets : [];
  if (assets.length === 0) {
    throw new Error('No assets found in lottie config.');
  }

  const token = getToken(env);
  const timeoutMs = toTimeoutMs(
    process.env.LOTTIE_SYNC_TIMEOUT_MS || env.LOTTIE_SYNC_TIMEOUT_MS,
  );

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let issues = 0;

  for (const asset of assets) {
    const id = typeof asset.id === 'string' ? asset.id.trim() : '';
    if (!id) {
      issues += 1;
      console.error('Skipping asset with missing id.');
      continue;
    }

    if (ids && !ids.has(id)) {
      continue;
    }

    const sourceUrl = resolveSourceUrl(asset, env);
    if (!sourceUrl) {
      skipped += 1;
      console.warn(
        `Skipped "${id}" (no source URL configured. Set ${asset.sourceUrlEnv || 'sourceUrl'}).`,
      );
      continue;
    }

    let outputRelativePath;
    try {
      outputRelativePath = ensureRelativeOutput(asset.output);
    } catch (error) {
      issues += 1;
      console.error(`Skipped "${id}": ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const outputPath = path.resolve(rootDir, outputRelativePath);
    let headers;
    try {
      headers = getHeaders(asset, token);
    } catch (error) {
      issues += 1;
      console.error(`Skipped "${id}": ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const json = await fetchJson({ headers, timeoutMs, url: sourceUrl });
    const nextContent = canonicalJson(json);
    const prevContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;

    if (prevContent === nextContent) {
      unchanged += 1;
      console.log(`Unchanged: ${id}`);
      continue;
    }

    if (isCheck) {
      issues += 1;
      console.error(`Out of date: ${id} -> ${outputRelativePath}`);
      continue;
    }

    if (isDryRun) {
      updated += 1;
      console.log(`Would update: ${id} -> ${outputRelativePath}`);
      continue;
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, nextContent, 'utf8');
    updated += 1;
    console.log(`Updated: ${id} -> ${outputRelativePath}`);
  }

  console.log(
    `Done. Updated=${updated} Unchanged=${unchanged} Skipped=${skipped} Issues=${issues}`,
  );

  if (issues > 0 && (isCheck || isStrict)) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Lottie sync failed: ${message}`);
  process.exit(1);
});
