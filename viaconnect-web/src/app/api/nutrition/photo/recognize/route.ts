// Prompt #170 Phase 1j: POST /api/nutrition/photo/recognize.
//
// Subset of /api/nutrition/photo/analyze: vision detection only. No resolver,
// no portion estimation, no save. Used by the admin retry surface and by the
// in-app diagnostics overlay when a user wants to re-check what the providers
// saw before committing to an analyze run.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';

import { detectMeal } from '@/lib/nutrition/vision/detect';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/nutrition/photo/recognize';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const HANDLER_TIMEOUT_MS = 30_000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const UUID_V4_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_DEVICE_CLASS = new Set([
  'ios_lidar',
  'ios_no_lidar',
  'android_arcore',
  'android_no_depth',
  'web',
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = newRequestId();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HANDLER_TIMEOUT_MS);
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AIRouteError(
        'UNAUTHENTICATED',
        'no session',
        401,
        'Please sign in to log meals.',
      );
    }
    userId = user.id;

    const form = await req.formData().catch(() => null);
    if (!form) {
      throw new AIRouteError('INVALID_INPUT', 'no form', 400, 'Please upload a photo.');
    }

    const imageRaw = form.get('image');
    if (!(imageRaw instanceof File)) {
      throw new AIRouteError('INVALID_INPUT', 'no image', 400, 'Please upload a photo.');
    }
    if (imageRaw.size > MAX_FILE_BYTES) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'too large',
        413,
        'Image too large. Please use an image under 10 MB.',
      );
    }
    const mime = imageRaw.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      if (mime === 'image/heic' || mime === 'image/heif') {
        throw new AIRouteError(
          'INVALID_INPUT',
          'heic',
          400,
          'HEIC not supported yet. Please use JPG, PNG, or WebP.',
        );
      }
      throw new AIRouteError(
        'INVALID_INPUT',
        `mime: ${mime}`,
        400,
        'Unsupported image type.',
      );
    }

    const capturedAtRaw = form.get('captured_at');
    const capturedAt = typeof capturedAtRaw === 'string' && !Number.isNaN(Date.parse(capturedAtRaw))
      ? capturedAtRaw
      : new Date().toISOString();

    const clientIdRaw = form.get('client_id');
    const clientId = typeof clientIdRaw === 'string' && UUID_V4_RX.test(clientIdRaw)
      ? clientIdRaw
      : null;
    if (clientId === null) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'bad client_id',
        400,
        'A valid client id is required.',
      );
    }

    const deviceClassRaw = form.get('device_class');
    const deviceClassStr = typeof deviceClassRaw === 'string' ? deviceClassRaw : '';
    if (!ALLOWED_DEVICE_CLASS.has(deviceClassStr)) {
      throw new AIRouteError(
        'INVALID_INPUT',
        `device_class: ${deviceClassStr}`,
        400,
        'A valid device class is required.',
      );
    }
    const deviceClass = deviceClassStr as
      | 'ios_lidar'
      | 'ios_no_lidar'
      | 'android_arcore'
      | 'android_no_depth'
      | 'web';

    const monthSpendRaw = form.get('month_spend_usd_so_far');
    const monthSpendUsdSoFar = typeof monthSpendRaw === 'string' && monthSpendRaw.length > 0
      ? Number(monthSpendRaw)
      : 0;
    const monthlyCapUsdClaude = Number(process.env.NUTRIVISION_CLAUDE_MONTHLY_CAP_USD ?? 100);

    const buf = Buffer.from(await imageRaw.arrayBuffer());
    const supabaseAdmin = createAdminClient();

    const detectResult = await detectMeal({
      imageBytes: buf,
      mime,
      requestId,
      deviceClass,
      capturedAt,
      monthSpendUsdSoFar: Number.isFinite(monthSpendUsdSoFar) ? monthSpendUsdSoFar : 0,
      monthlyCapUsdClaude,
      supabaseAdmin,
    });

    const latencyMs = Date.now() - startedAt;
    await recordAudit({
      requestId,
      userId: user.id,
      route: ROUTE,
      provider: 'google',
      outcome: 'success',
      httpStatus: 200,
      latencyMs,
    });
    safeLog.info('api.nutrivision.photo.recognize', 'recognize ok', {
      request_id: requestId,
      user_id: user.id,
      latency_ms: latencyMs,
      providers_called: detectResult.providersCalled,
      from_cache: detectResult.fromCache,
      item_count: detectResult.recognition.items.length,
    });

    return NextResponse.json({
      recognition: detectResult.recognition,
      providers_called: detectResult.providersCalled,
      from_cache: detectResult.fromCache,
      requestId,
    });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrivision.photo.recognize', 'failure', {
      request_id: requestId,
      user_id: userId,
      code: ai.code,
      message: ai.message,
    });
    await recordAudit({
      requestId,
      userId,
      route: ROUTE,
      provider: 'google',
      outcome: 'failure',
      errorCode: ai.code,
      httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: { code: ai.code, message: ai.userMessage, requestId } },
      { status: ai.httpStatus },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
