const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const mobileSrcRoot = path.join(repoRoot, 'src');

function listSourceFiles(root) {
  const queue = [root];
  const files = [];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!nextPath.endsWith('.ts') && !nextPath.endsWith('.tsx')) {
        continue;
      }

      files.push(nextPath);
    }
  }

  return files;
}

test('mobile client source does not reference Supabase service-role secrets', () => {
  const sourceFiles = listSourceFiles(mobileSrcRoot);
  const violations = [];

  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (
      content.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      content.includes('service_role')
    ) {
      violations.push(path.relative(repoRoot, filePath));
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found service-role secret references in mobile client code: ${violations.join(', ')}`,
  );
});

test('account deletion API uses edge function and not legacy request RPCs', () => {
  const apiFile = path.join(mobileSrcRoot, 'lib', 'api', 'accountDeletion.ts');
  const content = fs.readFileSync(apiFile, 'utf8');

  assert.match(content, /functions\.invoke<.*>\(\s*'delete-account'/s);
  assert.ok(!content.includes('create_account_deletion_request'));
  assert.ok(!content.includes('get_account_deletion_status'));
});
