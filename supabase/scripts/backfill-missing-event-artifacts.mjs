#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const options = {
    artifactOnly: false,
    concurrency: null,
    force: false,
    horizonDays: null,
    limit: null,
    strict: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--artifact-only") {
      options.artifactOnly = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg.startsWith("--horizon-days=")) {
      options.horizonDays = arg.split("=", 2)[1] ?? null;
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      options.concurrency = arg.split("=", 2)[1] ?? null;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = arg.split("=", 2)[1] ?? null;
      continue;
    }
  }

  return options;
}

function runStep(name, scriptPath, args) {
  console.log(`\n[backfill] ${name}`);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status ?? 1}.`);
  }
}

function main() {
  const options = parseArgs(process.argv);
  const scriptsDir = path.resolve(path.dirname(process.argv[1]));

  const sharedArgs = [];
  if (options.horizonDays) {
    sharedArgs.push(`--horizon-days=${options.horizonDays}`);
  }
  if (options.concurrency) {
    sharedArgs.push(`--concurrency=${options.concurrency}`);
  }
  if (options.limit) {
    sharedArgs.push(`--limit=${options.limit}`);
  }

  const scriptPrewarmArgs = [...sharedArgs];
  if (options.force) {
    scriptPrewarmArgs.push("--force");
  }

  const audioPrewarmArgs = [...sharedArgs];
  if (options.force) {
    audioPrewarmArgs.push("--force");
  }
  if (options.artifactOnly) {
    audioPrewarmArgs.push("--artifact-only");
  } else {
    audioPrewarmArgs.push("--allow-generation");
  }

  const validationArgs = [];
  if (options.horizonDays) {
    validationArgs.push(`--horizon-days=${options.horizonDays}`);
  }
  if (options.strict) {
    validationArgs.push("--strict");
  }

  runStep(
    "Prewarm event scripts",
    path.join(scriptsDir, "prewarm-event-occurrence-scripts.mjs"),
    scriptPrewarmArgs,
  );
  runStep(
    "Prewarm event audio artifacts",
    path.join(scriptsDir, "prewarm-event-occurrence-audio-artifacts.mjs"),
    audioPrewarmArgs,
  );
  runStep(
    "Validate event artifacts",
    path.join(scriptsDir, "validate-event-occurrence-artifacts.mjs"),
    validationArgs,
  );

  console.log("\n[backfill] Event artifact backfill completed.");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[backfill] ${message}`);
  process.exit(1);
}
