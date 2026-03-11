#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const options = {
    artifactOnly: false,
    dryRun: false,
    force: false,
    horizonDays: null,
    limit: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--artifact-only") {
      options.artifactOnly = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg.startsWith("--horizon-days=")) {
      options.horizonDays = arg.split("=", 2)[1] ?? null;
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
  console.log(`\n[prewarm] ${name}`);
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
  if (options.limit) {
    sharedArgs.push(`--limit=${options.limit}`);
  }
  if (options.horizonDays) {
    sharedArgs.push(`--horizon-days=${options.horizonDays}`);
  }

  const prayerAudioArgs = [...sharedArgs];
  const eventScriptArgs = [...sharedArgs];
  const eventAudioArgs = [...sharedArgs];

  if (options.force) {
    eventScriptArgs.push("--force");
    eventAudioArgs.push("--force");
  }

  if (options.dryRun) {
    prayerAudioArgs.push("--dry-run");
    eventScriptArgs.push("--dry-run");
    eventAudioArgs.push("--dry-run");
  }

  if (options.artifactOnly) {
    eventAudioArgs.push("--artifact-only");
  } else {
    eventAudioArgs.push("--allow-generation");
  }

  runStep(
    "Generate prayer scripts",
    path.join(scriptsDir, "generate-prayer-library-scripts.mjs"),
    [],
  );
  runStep(
    "Prewarm prayer audio artifacts",
    path.join(scriptsDir, "prewarm-prayer-audio-artifacts.mjs"),
    prayerAudioArgs,
  );
  runStep(
    "Prewarm event scripts",
    path.join(scriptsDir, "prewarm-event-occurrence-scripts.mjs"),
    eventScriptArgs,
  );
  runStep(
    "Prewarm event audio artifacts",
    path.join(scriptsDir, "prewarm-event-occurrence-audio-artifacts.mjs"),
    eventAudioArgs,
  );
  runStep(
    "Validate event artifacts",
    path.join(scriptsDir, "validate-event-occurrence-artifacts.mjs"),
    [],
  );

  console.log("\n[prewarm] Canonical prayer/event prewarm complete.");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[prewarm] ${message}`);
  process.exit(1);
}
