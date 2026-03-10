import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadStagingData, validateStagingBundleShape } from './staging-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildBundle() {
  const staging = loadStagingData();
  const validation = validateStagingBundleShape(staging);

  if (validation.errors.length > 0) {
    console.error('Cannot build bundle; staging validation failed:');
    for (const err of validation.errors) console.error(`- ${err}`);
    process.exit(1);
  }

  const bundle = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      package: 'mobile/docs/redesign/figma-handoff/staging',
      repoRelativeRoot: 'mobile/docs/redesign/figma-handoff/staging',
    },
    manifest: staging.manifest,
    pageSpecs: staging.pageSpecs.map((spec) => ({
      fileName: spec.fileName,
      content: spec.content,
    })),
    data: staging.data,
    docs: staging.docs,
    validationSummary: validation.summary,
  };

  const distDir = path.resolve(__dirname, '..', 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const outPath = path.join(distDir, 'egregorv2-staging-bundle.json');
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), 'utf8');

  console.log(`Bundle written: ${outPath}`);
  console.log(JSON.stringify(validation.summary, null, 2));
}

buildBundle();
