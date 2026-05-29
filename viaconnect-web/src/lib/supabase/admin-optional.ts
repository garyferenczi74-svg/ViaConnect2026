// Prompt #170 Phase 1q hotfix: optional service-role Supabase client.
//
// Returns null when SUPABASE_SERVICE_ROLE_KEY is missing instead of throwing.
// Use this for endpoints that can degrade gracefully (skip cache, skip corpus,
// skip best-effort writes). For paths that MUST have admin access, keep
// using strict createAdminClient from './admin'.
//
// The createClient import is intentionally separate from './admin' so the
// strict module-level singleton cache stays untouched and callers using the
// strict path still hit its fail-fast behavior.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';

// Try to create a service-role Supabase client. Returns null when the
// SUPABASE_SERVICE_ROLE_KEY env var is missing, instead of throwing.
// Use this when an endpoint can degrade gracefully (skip cache, skip corpus,
// skip best-effort writes). For paths that MUST have admin access, keep
// using strict createAdminClient from './admin'.
export function tryCreateAdminClient(): SupabaseClient | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      safeLog.warn('supabase.admin_optional.missing', 'tryCreateAdminClient', {
        has_url: Boolean(url),
        has_service_key: Boolean(serviceKey),
      });
      return null;
    }
    return createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  } catch (err) {
    safeLog.warn('supabase.admin_optional.create_failed', 'tryCreateAdminClient', {
      error_class: (err as { name?: string })?.name ?? 'Error',
    });
    return null;
  }
}
