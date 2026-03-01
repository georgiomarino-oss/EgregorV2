const rawClientEnv = {
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
} as const;

const requiredEnvKeys = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;
const optionalEnvKeys = ['EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'] as const;

function collectMissingKeys<T extends readonly (keyof typeof rawClientEnv)[]>(keys: T) {
  return keys.filter((key) => !rawClientEnv[key]?.trim());
}

const missingRequired = collectMissingKeys(requiredEnvKeys);
const missingOptional = collectMissingKeys(optionalEnvKeys);

export const clientEnv = {
  mapboxToken: rawClientEnv.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '',
  supabaseAnonKey: rawClientEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
  supabaseUrl: rawClientEnv.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
} as const;

export const envValidation = {
  hasBlockingIssues: missingRequired.length > 0,
  missingOptional,
  missingRequired,
} as const;
