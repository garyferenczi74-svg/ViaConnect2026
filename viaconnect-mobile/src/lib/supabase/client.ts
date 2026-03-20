import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Use AsyncStorage only on native/client — skip during SSR (static export)
const isSSR = typeof window === 'undefined' && Platform.OS === 'web';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(isSSR ? {} : { storage: AsyncStorage }),
    autoRefreshToken: !isSSR,
    persistSession: !isSSR,
    detectSessionInUrl: false,
  },
});
