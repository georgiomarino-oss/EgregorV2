import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, '..');
const outDir = resolve(mobileRoot, '.tmp-final-art-tests');

if (existsSync(outDir)) {
  rmSync(outDir, { force: true, recursive: true });
}

const compileCommand = [
  'npx tsc',
  '--pretty false',
  '--target es2020',
  '--module commonjs',
  '--moduleResolution node',
  '--types node',
  '--esModuleInterop',
  '--skipLibCheck',
  `--outDir "${outDir}"`,
  'tests/final-art-cinematic-slots.test.cts',
  'src/lib/art/cinematicArtSlots.ts',
].join(' ');

try {
  execSync(compileCommand, { cwd: mobileRoot, stdio: 'inherit' });
  execSync(`node --test "${resolve(outDir, 'tests/final-art-cinematic-slots.test.cjs')}"`, {
    cwd: mobileRoot,
    stdio: 'inherit',
  });
} finally {
  if (existsSync(outDir)) {
    rmSync(outDir, { force: true, recursive: true });
  }
}
