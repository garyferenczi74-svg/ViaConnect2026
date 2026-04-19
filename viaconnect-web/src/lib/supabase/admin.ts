// Service-role Supabase client for server contexts that operate without a
// user session, primarily Stripe webhook handlers and admin scripts.
//
// SAFETY: this client bypasses RLS. Only import it from server-side code
// where the caller has already been authenticated via a separate mechanism
// (Stripe webhook signature, admin-only route, etc.).

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  cached = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
