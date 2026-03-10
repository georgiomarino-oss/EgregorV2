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
  'tests/globe-canonical-data-mapping.test.cts',
  'tests/globe-no-location-permission-regression.test.cts',
  'src/features/events/services/globeData.ts',
  'src/features/events/services/globeVisualState.ts',
  'src/features/events/services/liveModel.ts',
  'src/features/events/types.ts',
  'src/features/events/utils/globe.ts',
  'src/features/events/utils/occurrence.ts',
  'src/lib/invite.ts',
  'src/lib/api/data.ts',
  'src/app/navigation/types.ts',
].join(' ');

try {
  execSync(compileCommand, { cwd: mobileRoot, stdio: 'inherit' });
  const liveModelTestPath = resolve(outDir, 'tests/phase3b-live-model.test.cjs');
  const globeDataTestPath = resolve(outDir, 'tests/globe-canonical-data-mapping.test.cjs');
  const globePermissionsTestPath = resolve(
    outDir,
    'tests/globe-no-location-permission-regression.test.cjs',
  );
  execSync(
    `node --test "${liveModelTestPath}" "${globeDataTestPath}" "${globePermissionsTestPath}"`,
    {
      cwd: mobileRoot,
      stdio: 'inherit',
    },
  );
} finally {
  if (existsSync(outDir)) {
    rmSync(outDir, { force: true, recursive: true });
  }
}
