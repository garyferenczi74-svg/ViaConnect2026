/**
 * Prompt 219b: upload a supplement label photo to the private
 * user-supplement-label-photos bucket. Per-user pathing, signed URL
 * returned for owner session only. No public access.
 *
 * Three-layer resilience (route side):
 *   1. Auth required
 *   2. Timeout on storage call (fail-open JSON retry, no throw to client)
 *   3. Structured safeLog without image bytes / health content
 *
 * Client retains the photo blob for retry when this returns retryable.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const LABEL_PHOTO_BUCKET = 'user-supplement-label-photos';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB after client compress
const UPLOAD_TIMEOUT_MS = 20_000;
const SIGNED_TTL_SEC = 3600;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, retryable: false, error: 'Sign in required to upload a label photo.' },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, retryable: false, error: 'No photo file received.' },
        { status: 400 },
      );
    }

    const mime = (file.type || 'image/jpeg').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        {
          success: false,
          retryable: false,
          error: 'Unsupported image format. Use JPEG, PNG, WebP, or HEIC.',
        },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          retryable: file.size > MAX_BYTES,
          error:
            file.size > MAX_BYTES
              ? 'Photo is too large after compression. Try a smaller image.'
              : 'Empty photo file.',
        },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ym = new Date().toISOString().slice(0, 7);
    const fileId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${user.id}/${ym}/${fileId}.${extForMime(mime)}`;

    safeLog.info('api.supplements.label-photo.upload', 'start', {
      userId: user.id,
      bytes: buf.byteLength,
      mime,
      // path prefix only (no full object until success)
      pathPrefix: `${user.id}/${ym}/`,
    });

    let uploadError: string | null = null;
    try {
      const result = await withTimeout(
        supabase.storage
          .from(LABEL_PHOTO_BUCKET)
          .upload(storagePath, buf, { contentType: mime, upsert: false }),
        UPLOAD_TIMEOUT_MS,
      );
      if (result.error) {
        uploadError = result.error.message;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'upload_failed';
      uploadError = msg === 'UPLOAD_TIMEOUT' ? 'UPLOAD_TIMEOUT' : msg;
    }

    if (uploadError) {
      safeLog.warn('api.supplements.label-photo.upload', 'failed', {
        userId: user.id,
        error: uploadError.slice(0, 120),
        bytes: buf.byteLength,
      });
      return NextResponse.json(
        {
          success: false,
          retryable: true,
          error:
            uploadError === 'UPLOAD_TIMEOUT'
              ? 'Upload timed out. Your photo is still on this device. Retry when ready.'
              : 'Upload failed. Your photo is still on this device. Retry when ready.',
        },
        { status: 503 },
      );
    }

    let signedUrl: string | null = null;
    try {
      const signed = await supabase.storage
        .from(LABEL_PHOTO_BUCKET)
        .createSignedUrl(storagePath, SIGNED_TTL_SEC);
      if (signed.data?.signedUrl) signedUrl = signed.data.signedUrl;
    } catch {
      // Signed URL is optional for the pipeline; path is enough to attach.
    }

    safeLog.info('api.supplements.label-photo.upload', 'ok', {
      userId: user.id,
      bytes: buf.byteLength,
      hasSignedUrl: Boolean(signedUrl),
    });

    return NextResponse.json({
      success: true,
      bucket: LABEL_PHOTO_BUCKET,
      path: storagePath,
      signedUrl,
      expiresInSec: SIGNED_TTL_SEC,
    });
  } catch (error) {
    safeLog.error('api.supplements.label-photo.upload', 'unexpected', { error });
    return NextResponse.json(
      {
        success: false,
        retryable: true,
        error: 'Upload failed unexpectedly. Your photo is still on this device.',
      },
      { status: 500 },
    );
  }
}
