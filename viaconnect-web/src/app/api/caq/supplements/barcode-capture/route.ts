// =============================================================================
// Prompt 175l (2026-06-05): barcode capture corpus ingest.
//
// Per 175f Section 2.6. Consent-gated frame storage for the
// barcode-analyzer bucket plus a PHI-free metadata row in
// public.barcode_capture_corpus. Every scan attempt the overlay POSTs
// lands here; consent only governs whether the frame bytes are
// persisted to Storage. The metadata row is always written so failure
// analytics work without the image content.
//
// Privacy posture: user_hash via caq_compute_user_hash() (SECURITY
// DEFINER, reads vault get_corpus_salt(), returns hex sha256), never
// auth.uid() or email in the row. PHI-free metadata columns only.
// Frame bytes (when stored) live under the salted hash path, scoped
// to the consent ledger.
// =============================================================================

import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BUCKET_NAME = 'barcode-analyzer';
const CONSENT_FEATURE_ID = 'barcode_capture_corpus';
const MAX_FRAME_BYTES = 800_000; // ~800 KB, matches 175f Section 2.2 target

interface CapturePayload {
  value?: unknown;
  format?: unknown;
  validChecksum?: unknown;
  frameJpegBase64?: unknown;
  frameWidth?: unknown;
  frameHeight?: unknown;
  device?: unknown;
  decoded?: unknown;
}

export async function POST(request: Request) {
  let body: CapturePayload | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as CapturePayload;
    }
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 200 });
  }

  // Auth: the corpus row is keyed by salted user hash so the route MUST
  // know which user is scanning. Anonymous calls are dropped.
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 200 });
  }

  const admin = createAdminClient();

  // Resolve the salted user_hash through the SQL helper that wraps
  // get_corpus_salt + sha256. Salt never crosses into JS.
  let userHash: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hash, error: hashErr } = await (admin as any).rpc('caq_compute_user_hash', { p_user_id: userId });
    if (hashErr) {
      safeLog.warn('caq.barcode-capture', 'user_hash rpc failed', { error: hashErr });
    } else if (typeof hash === 'string' && hash.length > 0) {
      userHash = hash;
    }
  } catch (err) {
    safeLog.warn('caq.barcode-capture', 'user_hash rpc threw', { error: err });
  }
  if (!userHash) {
    // Last-resort fallback so the corpus row still writes. Logged so the
    // missing function or vault secret is visible.
    safeLog.warn('caq.barcode-capture', 'user_hash fallback used', {});
    const { createHash } = await import('crypto');
    userHash = createHash('sha256').update(`${userId}|corpus_salt_fallback_v1`).digest('hex');
  }

  // Consent: barcode_capture_corpus feature opt-in. If absent or
  // opted_out, we still write the metadata row but do NOT store the
  // image bytes.
  let consent = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: optRow } = await (admin as any)
      .from('user_feature_opt_ins')
      .select('opted_in')
      .eq('user_id', userId)
      .eq('feature_id', CONSENT_FEATURE_ID)
      .maybeSingle();
    consent = optRow?.opted_in === true;
  } catch (err) {
    safeLog.warn('caq.barcode-capture', 'consent lookup failed', { error: err });
    consent = false;
  }

  const decodedValue = typeof body.value === 'string' ? body.value.slice(0, 64) : null;
  const symbology = typeof body.format === 'string' ? body.format.slice(0, 16) : null;
  const validChecksum = typeof body.validChecksum === 'boolean' ? body.validChecksum : null;
  const decoded = typeof body.decoded === 'boolean' ? body.decoded : decodedValue !== null;
  const frameWidth = typeof body.frameWidth === 'number' && Number.isFinite(body.frameWidth)
    ? Math.max(0, Math.floor(body.frameWidth))
    : null;
  const frameHeight = typeof body.frameHeight === 'number' && Number.isFinite(body.frameHeight)
    ? Math.max(0, Math.floor(body.frameHeight))
    : null;
  const device = typeof body.device === 'string' ? body.device.slice(0, 64) : null;
  const frameBase64 = typeof body.frameJpegBase64 === 'string' ? body.frameJpegBase64 : null;

  let storagePath: string | null = null;
  let imageBytes: number | null = null;

  if (consent && frameBase64 && frameBase64.length > 0) {
    try {
      const buffer = Buffer.from(frameBase64, 'base64');
      if (buffer.byteLength > 0 && buffer.byteLength <= MAX_FRAME_BYTES) {
        const now = new Date();
        const yyyy = String(now.getUTCFullYear());
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const objectId = crypto.randomUUID();
        const path = `barcode-captures/${yyyy}/${mm}/${userHash}/${objectId}.jpg`;

        const { error: uploadErr } = await admin.storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (uploadErr) {
          safeLog.warn('caq.barcode-capture', 'storage upload failed', {
            error: uploadErr,
            bytes: buffer.byteLength,
          });
        } else {
          storagePath = path;
          imageBytes = buffer.byteLength;
        }
      } else {
        safeLog.warn('caq.barcode-capture', 'frame size out of range', {
          bytes: buffer.byteLength,
          maxBytes: MAX_FRAME_BYTES,
        });
      }
    } catch (err) {
      safeLog.warn('caq.barcode-capture', 'frame decode failed', { error: err });
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (admin as any)
      .from('barcode_capture_corpus')
      .insert({
        storage_path: storagePath,
        user_hash: userHash,
        consent,
        decode_success: decoded,
        decoded_value: decodedValue,
        symbology,
        valid_checksum: validChecksum,
        image_bytes: imageBytes,
        frame_width: frameWidth,
        frame_height: frameHeight,
        device,
        region: null,
      });
    if (insertErr) {
      safeLog.warn('caq.barcode-capture', 'corpus insert failed', { error: insertErr });
    }
  } catch (err) {
    safeLog.error('caq.barcode-capture', 'corpus insert threw', { error: err });
  }

  return NextResponse.json({
    ok: true,
    consent,
    stored: storagePath !== null,
    imageBytes,
  }, { status: 200 });
}
