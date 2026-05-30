// =============================================================================
// off-cache-nightly-purge Edge Function (Prompt #170l Phase 1b)
// =============================================================================
// Nightly cron via pg_cron + pg_net. Single responsibility:
//
//   Cold-purge of off_product_cache rows that have not been hit in 90 days
//   per spec §3.4. Rows with last_hit_at < now() - 90 days are removed in
//   batches. Stale (expired_at < now()) rows are NOT purged here; expired
//   rows are revalidated on-demand by the stale-while-revalidate path in
//   /api/nutrition/barcode/lookup. The 90-day cold purge is the storage
//   pressure mitigation.
//
// Auth: service-role JWT in Authorization header. Caller is pg_cron via
// pg_net.http_post.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const COLD_PURGE_BATCH_LIMIT = 1000;
const COLD_PURGE_AGE_DAYS = 90;
const DB_TIMEOUT_MS = 10000;

interface PurgeSummary {
  coldRowsPurged: number;
  cutoff: string;
  durationMs: number;
  errors: ReadonlyArray<{ stage: string; error_class: string }>;
}

interface CacheRow {
  barcode: string;
}

function classifyError(err: unknown): string {
  if (isTimeoutError(err)) return 'TimeoutError';
  if (err instanceof Error) return err.name;
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { name?: unknown };
    if (typeof maybe.name === 'string') return maybe.name;
  }
  return 'UnknownError';
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function purgeColdRows(
  supabaseAdmin: SupabaseClient,
  cutoffIso: string,
  errors: Array<{ stage: string; error_class: string }>,
): Promise<number> {
  const lookup = await withTimeout(
    supabaseAdmin
      .from('off_product_cache')
      .select('barcode')
      .lt('last_hit_at', cutoffIso)
      .limit(COLD_PURGE_BATCH_LIMIT),
    DB_TIMEOUT_MS,
    'off_cache.cold.select',
  );

  if (lookup.error) {
    errors.push({ stage: 'cold_select', error_class: 'SupabaseError' });
    safeLog.error('off-cache-nightly-purge', 'cold select failed', {
      error: lookup.error.message,
    });
    return 0;
  }

  const rows = (lookup.data ?? []) as CacheRow[];
  if (rows.length === 0) return 0;

  const barcodes = rows.map((r) => r.barcode);
  const dbDelete = await withTimeout(
    supabaseAdmin.from('off_product_cache').delete().in('barcode', barcodes),
    DB_TIMEOUT_MS,
    'off_cache.cold.delete',
  );

  if (dbDelete.error) {
    errors.push({ stage: 'cold_delete', error_class: 'SupabaseError' });
    safeLog.error('off-cache-nightly-purge', 'cold delete failed', {
      error: dbDelete.error.message,
    });
    return 0;
  }

  return barcodes.length;
}

export async function runPurge(supabaseAdmin: SupabaseClient): Promise<PurgeSummary> {
  const t0 = Date.now();
  const errors: Array<{ stage: string; error_class: string }> = [];
  const cutoff = new Date(Date.now() - COLD_PURGE_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const coldRowsPurged = await purgeColdRows(supabaseAdmin, cutoff, errors).catch((err) => {
    errors.push({ stage: 'cold_stage', error_class: classifyError(err) });
    safeLog.error('off-cache-nightly-purge', 'cold stage threw', { error: err });
    return 0;
  });

  return {
    coldRowsPurged,
    cutoff,
    durationMs: Date.now() - t0,
    errors,
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'POST required' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    safeLog.error('off-cache-nightly-purge', 'missing env', {
      has_url: SUPABASE_URL.length > 0,
      has_key: SERVICE_KEY.length > 0,
    });
    return json({ error: 'service not configured' }, 500);
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.includes(SERVICE_KEY)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabaseAdmin = admin();

  try {
    const summary = await runPurge(supabaseAdmin);
    safeLog.info('off-cache-nightly-purge', 'run complete', {
      cold_rows_purged: summary.coldRowsPurged,
      duration_ms: summary.durationMs,
      error_count: summary.errors.length,
    });
    return json(summary);
  } catch (err) {
    safeLog.error('off-cache-nightly-purge', 'fatal', { error: err });
    return json({ error: (err as Error).message }, 500);
  }
});
