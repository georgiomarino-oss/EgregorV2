import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('globe configuration does not reintroduce location permissions or plugins', () => {
  const appJsonPath = resolve(process.cwd(), 'app.json');
  const raw = readFileSync(appJsonPath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    expo?: {
      android?: {
        permissions?: string[];
      };
      plugins?: Array<string | [string, Record<string, unknown>]>;
    };
  };

  const androidPermissions = parsed.expo?.android?.permissions ?? [];
  assert.equal(androidPermissions.includes('android.permission.ACCESS_COARSE_LOCATION'), false);
  assert.equal(androidPermissions.includes('android.permission.ACCESS_FINE_LOCATION'), false);

  const pluginNames = (parsed.expo?.plugins ?? []).map((plugin) =>
    typeof plugin === 'string' ? plugin : plugin[0],
  );
  assert.equal(pluginNames.includes('expo-location'), false);
});
