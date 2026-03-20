import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Admin client with service_role key — bypasses RLS.
 * ONLY use in Edge Functions; never expose to client.
 */
export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Extract user ID from the Authorization header (JWT).
 * Returns null if missing / invalid.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}
