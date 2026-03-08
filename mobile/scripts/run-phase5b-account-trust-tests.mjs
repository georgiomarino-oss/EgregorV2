import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, '..');
const outDir = resolve(mobileRoot, '.tmp-phase5b-tests');

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
  'tests/phase5b-account-trust-presentation.test.cts',
  'src/features/profile/services/accountTrustPresentation.ts',
].join(' ');

try {
  execSync(compileCommand, { cwd: mobileRoot, stdio: 'inherit' });
  execSync(`node --test "${resolve(outDir, 'tests/phase5b-account-trust-presentation.test.cjs')}"`, {
    cwd: mobileRoot,
    stdio: 'inherit',
  });
} finally {
  if (existsSync(outDir)) {
    rmSync(outDir, { force: true, recursive: true });
  }
}
