import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { clientEnv } from './env';

if (!clientEnv.supabaseUrl || !clientEnv.supabaseAnonKey) {
  console.warn(
    '[Egregor] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Auth/API calls will fail until env vars are set.',
  );
}

export const supabase = createClient(
  clientEnv.supabaseUrl || 'https://placeholder.supabase.co',
  clientEnv.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
    global: {
      headers: {
        'x-egregor-client': 'mobile',
      },
    },
  },
);
