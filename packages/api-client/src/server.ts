import { createServerClient as createSupaServerClient } from '@supabase/ssr';
import type { Database } from './types';

type CookieMethods = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
};

export function createServerClient(cookieMethods: CookieMethods) {
  return createSupaServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    },
  );
}
