#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const scriptsDir = path.resolve(path.dirname(process.argv[1]));
const replacement = path.join(
  scriptsDir,
  "prewarm-event-occurrence-audio-artifacts.mjs",
);

console.warn(
  "[deprecated] prewarm-event-library-audio-artifacts.mjs has been replaced by prewarm-event-occurrence-audio-artifacts.mjs.",
);

const result = spawnSync(process.execPath, [replacement, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
