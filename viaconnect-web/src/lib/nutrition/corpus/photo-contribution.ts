// Prompt #170 Phase 1h: conditional photo contribution. When a user has
// opted in via user_nutrivision_settings.corpus_opt_in, the saved meal photo
// is stripped of EXIF + GPS metadata via sharp and uploaded to a path keyed
// by user_hash so the storage layer never exposes a user_id mapping. Best
// effort: a failure here never blocks the meal save.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../resilience/timeout';
import { safeLog } from '@/lib/utils/safe-log';

const DEFAULT_BUCKET = 'nutrivision-meals';
const CONTRIBUTE_TIMEOUT_MS = 5000;

export interface PhotoContributionOpts {
  supabaseAdmin: SupabaseClient;
  userHash: string;
  imageBytes: Buffer;
  mimeType: string;
  capturedAt: string;
  requestId: string;
  storageBucket?: string;
}

export interface PhotoContributionResult {
  contributed: boolean;
  storagePath?: string;
  reason?: string;
}

/**
 * Pure helper: strip EXIF and GPS metadata from image bytes via sharp.
 * Sharp's default JPEG pipeline drops metadata unless withMetadata is called,
 * so we deliberately omit it. Output is re-encoded JPEG at 85 percent with
 * mozjpeg, with auto-rotation applied based on the source EXIF orientation
 * before metadata is dropped.
 */
export async function stripImageMetadata(imageBytes: Buffer): Promise<Buffer> {
  return sharp(imageBytes).rotate().jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

function dateFolder(capturedAt: string): string {
  const d = new Date(capturedAt);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    return fallback.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

async function readOptInFlag(
  supabaseAdmin: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<boolean> {
  const builder = supabaseAdmin
    .from('user_nutrivision_settings')
    .select('corpus_opt_in')
    .eq('user_id', userId)
    .maybeSingle();
  const result = await withTimeout(
    Promise.resolve(builder) as Promise<{ data: { corpus_opt_in: boolean } | null; error: { message: string } | null }>,
    { timeoutMs: CONTRIBUTE_TIMEOUT_MS, op: 'corpus.read_opt_in', requestId },
  );

  if (result.error) {
    safeLog.warn('nutrition.corpus.photo_contribute_failed', 'opt-in read error', {
      request_id: requestId,
      error: result.error.message,
    });
    return false;
  }

  return result.data?.corpus_opt_in === true;
}

/**
 * Check user_nutrivision_settings.corpus_opt_in. If false (or no row), return
 * { contributed: false, reason: 'user_opt_out' } with no storage interaction.
 * If true, strip metadata via sharp and upload to
 *   nutrivision-meals/<userHash>/<YYYY-MM-DD>/<uuid>.jpg.
 * Errors never throw; they downgrade to { contributed: false, reason }.
 */
export async function maybeContributePhoto(
  opts: PhotoContributionOpts & { userId: string },
): Promise<PhotoContributionResult> {
  const {
    supabaseAdmin,
    userId,
    userHash,
    imageBytes,
    requestId,
    storageBucket,
  } = opts;
  const bucket = storageBucket ?? DEFAULT_BUCKET;

  let optedIn: boolean;
  try {
    optedIn = await readOptInFlag(supabaseAdmin, userId, requestId);
  } catch (err) {
    safeLog.warn('nutrition.corpus.photo_contribute_failed', 'opt-in lookup threw', {
      request_id: requestId,
      error: err,
    });
    return { contributed: false, reason: 'opt_in_lookup_error' };
  }

  if (!optedIn) {
    return { contributed: false, reason: 'user_opt_out' };
  }

  try {
    const stripped = await stripImageMetadata(imageBytes);
    const folder = dateFolder(opts.capturedAt);
    const fileId = randomUUID();
    const storagePath = `${userHash}/${folder}/${fileId}.jpg`;

    const uploadResult = await withTimeout(
      supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, stripped, { contentType: 'image/jpeg', upsert: false }) as unknown as Promise<{ data: { path: string } | null; error: { message: string } | null }>,
      { timeoutMs: CONTRIBUTE_TIMEOUT_MS, op: 'corpus.photo_contribute', requestId },
    );

    if (uploadResult.error) {
      safeLog.warn('nutrition.corpus.photo_contribute_failed', 'upload returned error', {
        request_id: requestId,
        error: uploadResult.error.message,
      });
      return { contributed: false, reason: 'upload_error' };
    }

    return { contributed: true, storagePath };
  } catch (err) {
    safeLog.warn('nutrition.corpus.photo_contribute_failed', 'unexpected error', {
      request_id: requestId,
      error: err,
    });
    return { contributed: false, reason: 'upload_error' };
  }
}
