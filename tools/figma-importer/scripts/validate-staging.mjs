import { loadStagingData, validateStagingBundleShape } from './staging-utils.mjs';

function main() {
  const staging = loadStagingData();
  const validation = validateStagingBundleShape(staging);

  console.log('EgregorV2 staging validation summary:');
  console.log(JSON.stringify(validation.summary, null, 2));

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of validation.warnings) console.log(`- ${w}`);
  }

  if (validation.errors.length > 0) {
    console.error('\nValidation failed:');
    for (const e of validation.errors) console.error(`- ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nValidation passed.');
}

main();
