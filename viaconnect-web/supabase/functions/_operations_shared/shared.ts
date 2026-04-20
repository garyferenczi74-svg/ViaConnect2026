// Prompt #102 Phase 2 — shared helpers for operations edge functions.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function requireEnv(keys: string[]): string | null {
  for (const key of keys) if (!Deno.env.get(key)) return key;
  return null;
}

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function credentialsMissingResponse(missingKey: string, source: string): Response {
  console.warn(`[${source}] Missing credential: ${missingKey}. Skipping.`);
  return jsonResponse({ skipped: true, reason: 'credentials_missing', missing_key: missingKey });
}
