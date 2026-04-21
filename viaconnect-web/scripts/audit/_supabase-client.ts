// Photo Sync prompt: shared service-role Supabase client for audit scripts.
// Server-side only. Service role key loaded from process.env; never logged.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PROJECT_URL = 'https://nnhkcufyqjojdbvdrpky.supabase.co';

export function getServiceRoleClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 20) {
    process.stderr.write(
      'FATAL: SUPABASE_SERVICE_ROLE_KEY not set in environment.\n' +
      'Add it to .env.local (server-side only) before running this script.\n' +
      'Never commit the key. Never log it. Rotate at\n' +
      '  https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/settings/api\n' +
      'if it has ever been exposed.\n'
    );
    process.exit(1);
  }
  return createClient(PROJECT_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Mask any sb-* token leaking into stdout/stderr before printing.
export function scrub(text: string): string {
  return text
    .replace(/sb[-_][A-Za-z0-9_-]{20,}/g, '[REDACTED:sb_token]')
    .replace(/eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[REDACTED:jwt]');
}

export function safeLog(message: string): void {
  process.stdout.write(scrub(message) + '\n');
}

export function nowIsoForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export const AUDIT_OUT_DIR = process.env.PHOTO_SYNC_OUT_DIR ?? '/tmp/viaconnect';
