/* global console, process */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCREENS_DIR = path.join(ROOT, 'src', 'screens');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

async function findViolations(filePath) {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    const matches = line.match(HEX_COLOR_PATTERN);
    if (!matches) {
      return;
    }

    violations.push({
      colors: matches,
      line: index + 1,
      path: toRepoPath(filePath),
      text: line.trim(),
    });
  });

  return violations;
}

async function main() {
  const screenFiles = await walkFiles(SCREENS_DIR);
  const allViolations = [];

  for (const filePath of screenFiles) {
    const violations = await findViolations(filePath);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log('check:no-screen-hex passed: no hex colors found in src/screens.');
    return;
  }

  console.error('check:no-screen-hex failed: hardcoded hex colors found in src/screens.');
  for (const violation of allViolations) {
    console.error(
      `- ${violation.path}:${violation.line} -> ${violation.colors.join(', ')} | ${violation.text}`,
    );
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('check:no-screen-hex failed with an unexpected error.');
  console.error(error);
  process.exitCode = 1;
});
