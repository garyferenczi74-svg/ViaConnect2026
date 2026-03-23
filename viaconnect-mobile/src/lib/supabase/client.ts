import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabaseSecureStorage } from '../auth/secure-session';
import type { Database } from './types';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaGtjdWZ5cWpvamRidmRycGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MzI5MjgsImV4cCI6MjA4OTIwODkyOH0.75jtXFDId6-W-WMItKXffwwhwUB2u0e37VAFmkK0FwM';

// Use SecureStore on native, skip during SSR (static export)
const isSSR = typeof window === 'undefined' && Platform.OS === 'web';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(isSSR ? {} : { storage: supabaseSecureStorage }),
    autoRefreshToken: !isSSR,
    persistSession: !isSSR,
    detectSessionInUrl: false,
  },
});
