// =============================================================================
// photo-meal-blob-cleanup Edge Function (Prompt #170 Phase 1h)
// =============================================================================
// Hourly cron via pg_cron + pg_net. Two responsibilities:
//
//   1. Expired ephemeral photos. Delete photo_meal_blobs rows where
//      scheduled_deletion_at < now() AND retention_policy = 'ephemeral_24h'.
//      For each row, also delete the storage object at
//      (storage_bucket, storage_path). 404s are tolerated; the row still
//      gets cleared.
//
//   2. Opt-in revocation grace. For each user_nutrivision_settings row with
//      opt_in_revoked_at more than 7 days ago, locate matching
//      user_meal_corpus rows by user_hash (computed via get_corpus_salt),
//      delete the storage object at (nutrivision-meals, contributed_photo_path),
//      and clear the column. The corpus row itself stays (recognition,
//      final_state, edit_diff retained as anonymized training data per ToS).
//
// Auth: service-role JWT in Authorization header. Caller is pg_cron via
// pg_net.http_post.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { createHash } from 'node:crypto';
import { withTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const EPHEMERAL_BATCH_LIMIT = 500;
const REVOCATION_BATCH_LIMIT = 200;
const DB_TIMEOUT_MS = 10000;
const STORAGE_TIMEOUT_MS = 5000;
const CURRENT_SALT_VERSION = 1;
const NUTRIVISION_BUCKET = 'nutrivision-meals';

interface CleanupSummary {
  ephemeralDeleted: number;
  storageObjectsDeleted: number;
  optInRevocationsApplied: number;
  errors: ReadonlyArray<{ stage: string; error_class: string }>;
}

interface BlobRow {
  id: string;
  storage_bucket: string;
  storage_path: string;
}

interface RevokedSettingsRow {
  user_id: string;
  opt_in_revoked_at: string;
}

interface CorpusRowForRevocation {
  id: string;
  contributed_photo_path: string;
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

async function tryDeleteStorageObject(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<{ deleted: boolean; error?: string }> {
  try {
    const result = await withTimeout(
      supabaseAdmin.storage.from(bucket).remove([path]),
      STORAGE_TIMEOUT_MS,
      `cleanup.storage.remove.${bucket}`,
    );
    if (result.error) {
      // 404 (object missing) is benign; proceed.
      const message = result.error.message ?? '';
      if (message.toLowerCase().includes('not found')) {
        return { deleted: false, error: 'not_found' };
      }
      return { deleted: false, error: message };
    }
    return { deleted: true };
  } catch (err) {
    return { deleted: false, error: (err as Error).message };
  }
}

async function readCorpusSalt(supabaseAdmin: SupabaseClient): Promise<string> {
  const result = await withTimeout(
    supabaseAdmin.rpc('get_corpus_salt'),
    DB_TIMEOUT_MS,
    'cleanup.get_corpus_salt',
  );
  if (result.error) {
    throw new Error(`get_corpus_salt failed: ${result.error.message}`);
  }
  if (typeof result.data !== 'string' || result.data.length === 0) {
    throw new Error('get_corpus_salt returned empty value');
  }
  return result.data;
}

function computeUserHash(userId: string, salt: string): string {
  return createHash('sha256').update(`${userId}${salt}`).digest('hex');
}

async function processEphemeralExpired(
  supabaseAdmin: SupabaseClient,
  errors: Array<{ stage: string; error_class: string }>,
): Promise<{ rowsDeleted: number; objectsDeleted: number }> {
  const nowIso = new Date().toISOString();

  const lookup = await withTimeout(
    supabaseAdmin
      .from('photo_meal_blobs')
      .select('id, storage_bucket, storage_path')
      .eq('retention_policy', 'ephemeral_24h')
      .lt('scheduled_deletion_at', nowIso)
      .limit(EPHEMERAL_BATCH_LIMIT),
    DB_TIMEOUT_MS,
    'cleanup.ephemeral.select',
  );

  if (lookup.error) {
    errors.push({ stage: 'ephemeral_select', error_class: 'SupabaseError' });
    safeLog.error('photo-meal-blob-cleanup', 'ephemeral select failed', {
      error: lookup.error.message,
    });
    return { rowsDeleted: 0, objectsDeleted: 0 };
  }

  const rows = (lookup.data ?? []) as BlobRow[];
  if (rows.length === 0) {
    return { rowsDeleted: 0, objectsDeleted: 0 };
  }

  let objectsDeleted = 0;
  const idsToDelete: string[] = [];

  for (const row of rows) {
    const removed = await tryDeleteStorageObject(supabaseAdmin, row.storage_bucket, row.storage_path);
    if (removed.deleted) objectsDeleted += 1;
    // Always queue the row for DB removal so we do not loop on a missing object.
    idsToDelete.push(row.id);
  }

  const dbDelete = await withTimeout(
    supabaseAdmin.from('photo_meal_blobs').delete().in('id', idsToDelete),
    DB_TIMEOUT_MS,
    'cleanup.ephemeral.delete',
  );

  if (dbDelete.error) {
    errors.push({ stage: 'ephemeral_delete', error_class: 'SupabaseError' });
    safeLog.error('photo-meal-blob-cleanup', 'ephemeral delete failed', {
      error: dbDelete.error.message,
    });
    return { rowsDeleted: 0, objectsDeleted };
  }

  return { rowsDeleted: idsToDelete.length, objectsDeleted };
}

async function processOptInRevocations(
  supabaseAdmin: SupabaseClient,
  errors: Array<{ stage: string; error_class: string }>,
): Promise<{ applied: number; objectsDeleted: number }> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const settingsLookup = await withTimeout(
    supabaseAdmin
      .from('user_nutrivision_settings')
      .select('user_id, opt_in_revoked_at')
      .not('opt_in_revoked_at', 'is', null)
      .lt('opt_in_revoked_at', cutoff)
      .limit(REVOCATION_BATCH_LIMIT),
    DB_TIMEOUT_MS,
    'cleanup.revocations.settings_select',
  );

  if (settingsLookup.error) {
    errors.push({ stage: 'revocation_settings_select', error_class: 'SupabaseError' });
    safeLog.error('photo-meal-blob-cleanup', 'revocation settings select failed', {
      error: settingsLookup.error.message,
    });
    return { applied: 0, objectsDeleted: 0 };
  }

  const settingsRows = (settingsLookup.data ?? []) as RevokedSettingsRow[];
  if (settingsRows.length === 0) {
    return { applied: 0, objectsDeleted: 0 };
  }

  let salt: string;
  try {
    salt = await readCorpusSalt(supabaseAdmin);
  } catch (err) {
    errors.push({ stage: 'revocation_salt', error_class: classifyError(err) });
    safeLog.error('photo-meal-blob-cleanup', 'salt read failed', { error: err });
    return { applied: 0, objectsDeleted: 0 };
  }

  let applied = 0;
  let objectsDeleted = 0;

  for (const settings of settingsRows) {
    const userHash = computeUserHash(settings.user_id, salt);

    const corpusLookup = await withTimeout(
      supabaseAdmin
        .from('user_meal_corpus')
        .select('id, contributed_photo_path')
        .eq('user_hash', userHash)
        .eq('salt_version', CURRENT_SALT_VERSION)
        .not('contributed_photo_path', 'is', null),
      DB_TIMEOUT_MS,
      'cleanup.revocations.corpus_select',
    );

    if (corpusLookup.error) {
      errors.push({ stage: 'revocation_corpus_select', error_class: 'SupabaseError' });
      safeLog.warn('photo-meal-blob-cleanup', 'corpus select failed', {
        error: corpusLookup.error.message,
      });
      continue;
    }

    const corpusRows = (corpusLookup.data ?? []) as CorpusRowForRevocation[];
    if (corpusRows.length === 0) continue;

    const idsToClear: string[] = [];
    for (const corpus of corpusRows) {
      const removed = await tryDeleteStorageObject(
        supabaseAdmin,
        NUTRIVISION_BUCKET,
        corpus.contributed_photo_path,
      );
      if (removed.deleted) objectsDeleted += 1;
      idsToClear.push(corpus.id);
    }

    const clear = await withTimeout(
      supabaseAdmin
        .from('user_meal_corpus')
        .update({ contributed_photo_path: null })
        .in('id', idsToClear),
      DB_TIMEOUT_MS,
      'cleanup.revocations.corpus_update',
    );

    if (clear.error) {
      errors.push({ stage: 'revocation_corpus_update', error_class: 'SupabaseError' });
      safeLog.warn('photo-meal-blob-cleanup', 'corpus update failed', {
        error: clear.error.message,
      });
      continue;
    }

    applied += idsToClear.length;
  }

  return { applied, objectsDeleted };
}

export async function runCleanup(supabaseAdmin: SupabaseClient): Promise<CleanupSummary> {
  const errors: Array<{ stage: string; error_class: string }> = [];

  const ephemeral = await processEphemeralExpired(supabaseAdmin, errors).catch((err) => {
    errors.push({ stage: 'ephemeral_stage', error_class: classifyError(err) });
    safeLog.error('photo-meal-blob-cleanup', 'ephemeral stage threw', { error: err });
    return { rowsDeleted: 0, objectsDeleted: 0 };
  });

  const revocations = await processOptInRevocations(supabaseAdmin, errors).catch((err) => {
    errors.push({ stage: 'revocation_stage', error_class: classifyError(err) });
    safeLog.error('photo-meal-blob-cleanup', 'revocation stage threw', { error: err });
    return { applied: 0, objectsDeleted: 0 };
  });

  return {
    ephemeralDeleted: ephemeral.rowsDeleted,
    storageObjectsDeleted: ephemeral.objectsDeleted + revocations.objectsDeleted,
    optInRevocationsApplied: revocations.applied,
    errors,
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'POST required' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    safeLog.error('photo-meal-blob-cleanup', 'missing env', {
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
  const t0 = Date.now();

  try {
    const summary = await runCleanup(supabaseAdmin);
    safeLog.info('photo-meal-blob-cleanup', 'run complete', {
      duration_ms: Date.now() - t0,
      summary,
    });
    return json(summary);
  } catch (err) {
    safeLog.error('photo-meal-blob-cleanup', 'fatal', { error: err });
    return json({ error: (err as Error).message }, 500);
  }
});
