import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, '..');
const outDir = resolve(mobileRoot, '.tmp-phase3b-tests');

if (existsSync(outDir)) {
  rmSync(outDir, { force: true, recursive: true });
}

const compileCommand = [
  'npx tsc',
  '--pretty false',
  '--target es2020',
  '--module commonjs',
  '--moduleResolution node',
  '--types node,react-native',
  '--esModuleInterop',
  '--skipLibCheck',
  `--outDir "${outDir}"`,
  'tests/phase3b-live-model.test.cts',
  'src/features/events/services/liveModel.ts',
  'src/features/events/types.ts',
  'src/lib/invite.ts',
  'src/lib/api/data.ts',
  'src/app/navigation/types.ts',
].join(' ');

try {
  execSync(compileCommand, { cwd: mobileRoot, stdio: 'inherit' });
  execSync(`node --test "${resolve(outDir, 'tests/phase3b-live-model.test.cjs')}"`, {
    cwd: mobileRoot,
    stdio: 'inherit',
  });
} finally {
  if (existsSync(outDir)) {
    rmSync(outDir, { force: true, recursive: true });
  }
}
