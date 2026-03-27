import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client using the service role key.
 * Lazily initialized singleton — reused across calls.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }

    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabaseAdmin;
}

/**
 * Standard headers for all Terra API requests.
 */
export const TERRA_HEADERS: Record<string, string> = {
  'dev-id': process.env.TERRA_DEV_ID ?? '',
  'x-api-key': process.env.TERRA_API_KEY ?? '',
  'Content-Type': 'application/json',
};

/**
 * Base URL for the Terra v2 API.
 */
export const TERRA_BASE_URL = 'https://api.tryterra.co/v2';
