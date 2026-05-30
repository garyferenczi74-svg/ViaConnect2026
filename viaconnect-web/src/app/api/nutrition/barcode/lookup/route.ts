// Prompt 170l Phase 1c-1: POST /api/nutrition/barcode/lookup.
//
// Direct-to-OFF lookup that bypasses the resolver cascade for barcode-keyed
// requests. Per spec §5.4: USDA FDC and farmceutica_curated_foods do not
// index barcodes, so consulting them is wasted latency.
//
// Flow:
//   1. Auth (user-scoped Supabase client)
//   2. Validate barcode (checksum)
//   3. Rate-limit check (200 lookups/user/day per Gate 4)
//   4. Cache read (off_product_cache) with stale-while-revalidate semantics
//   5. On cache miss or stale: OFF fetch + cache write + rate-limit increment
//   6. Return product + outcome enum
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { newRequestId } from '@/lib/observability/audit-recorder';

import { validateBarcode } from '@/lib/nutrition/barcode/checksum';
import { getCachedProduct, setCachedProduct } from '@/lib/nutrition/barcode/cache';
import { checkRateLimit, incrementRateLimit } from '@/lib/nutrition/barcode/rate-limit';
import {
  readBarcodeFeatureFlags,
  BARCODE_OFF_FETCH_TIMEOUT_MS,
} from '@/lib/nutrition/barcode/feature-flags';
import {
  lookupProductByBarcode,
  type OFFProduct,
} from '@/lib/nutrition/databases/open-food-facts';

const ROUTE = '/api/nutrition/barcode/lookup';

const RequestSchema = z.object({
  barcode: z.string().min(8).max(14),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const flags = readBarcodeFeatureFlags();
    if (!flags.barcodeScanEnabled) {
      throw new AIRouteError(
        'FEATURE_DISABLED',
        'barcode scanning kill switch off',
        503,
        'Barcode scanning is currently unavailable.',
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AIRouteError(
        'UNAUTHENTICATED',
        'no session',
        401,
        'Please sign in to scan barcodes.',
      );
    }
    userId = user.id;

    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'barcode missing or wrong length',
        400,
        'Enter 8 to 14 digits from the barcode.',
      );
    }
    const { barcode } = parsed.data;

    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      throw new AIRouteError(
        'INVALID_INPUT',
        `barcode checksum: ${validation.reason}`,
        400,
        validation.reason === 'wrong_length'
          ? 'That length is not a valid barcode. Try 8, 12, 13, or 14 digits.'
          : validation.reason === 'non_numeric'
            ? 'Barcodes are digits only.'
            : 'Check the digits. The last digit does not match.',
      );
    }

    const rateLimit = await checkRateLimit(userId, requestId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          outcome: 'rate_limit_exceeded',
          current: rateLimit.current,
          limit: rateLimit.limit,
          requestId,
        },
        { status: 429 },
      );
    }

    const cacheResult = await getCachedProduct(barcode, requestId);
    if (cacheResult.product !== null) {
      if (cacheResult.isStale) {
        void revalidateInBackground(barcode, requestId);
      }
      safeLog.info('api.nutrition.barcode.lookup', 'cache hit', {
        request_id: requestId,
        user_id: userId,
        barcode,
        is_stale: cacheResult.isStale,
      });
      return NextResponse.json({
        outcome: 'cache_hit',
        product: cacheResult.product,
        format: validation.format,
        is_stale: cacheResult.isStale,
        requestId,
      });
    }

    const t0 = performance.now();
    const product = await lookupProductByBarcode(barcode, {
      requestId,
      timeoutMs: BARCODE_OFF_FETCH_TIMEOUT_MS,
    });
    const lookupLatencyMs = Math.max(0, Math.round(performance.now() - t0));

    // Increment whether OFF hit or missed; both consumed an OFF round-trip.
    await incrementRateLimit(userId, requestId);

    if (product === null) {
      safeLog.info('api.nutrition.barcode.lookup', 'off miss', {
        request_id: requestId,
        user_id: userId,
        barcode,
        lookup_latency_ms: lookupLatencyMs,
      });
      return NextResponse.json(
        {
          outcome: 'off_miss',
          format: validation.format,
          lookup_latency_ms: lookupLatencyMs,
          requestId,
        },
        { status: 404 },
      );
    }

    await setCachedProduct(product, requestId);

    safeLog.info('api.nutrition.barcode.lookup', 'off hit', {
      request_id: requestId,
      user_id: userId,
      barcode,
      lookup_latency_ms: lookupLatencyMs,
      completeness: product.completeness,
      nova_group: product.nova_group,
      nutriscore_grade: product.nutriscore_grade,
    });

    return NextResponse.json({
      outcome: 'off_hit',
      product,
      format: validation.format,
      lookup_latency_ms: lookupLatencyMs,
      requestId,
    });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrition.barcode.lookup', 'failure', {
      request_id: requestId,
      user_id: userId,
      route: ROUTE,
      code: ai.code,
      message: ai.message,
    });
    return NextResponse.json(
      { error: { code: ai.code, message: ai.userMessage, requestId } },
      { status: ai.httpStatus },
    );
  }
}

async function revalidateInBackground(
  barcode: string,
  requestId: string,
): Promise<void> {
  try {
    const fresh = await lookupProductByBarcode(barcode, {
      requestId,
      timeoutMs: BARCODE_OFF_FETCH_TIMEOUT_MS,
    });
    if (fresh !== null) {
      await setCachedProduct(fresh, requestId);
      safeLog.info('api.nutrition.barcode.lookup', 'background revalidate ok', {
        request_id: requestId,
        barcode,
      });
    }
  } catch (err) {
    safeLog.warn('api.nutrition.barcode.lookup', 'background revalidate failed', {
      request_id: requestId,
      barcode,
      error: err,
    });
  }
}

// Re-export for downstream client typing convenience.
export type LookupSuccessResponse =
  | {
      outcome: 'cache_hit';
      product: unknown;
      format: string | null;
      is_stale: boolean;
      requestId: string;
    }
  | {
      outcome: 'off_hit';
      product: OFFProduct;
      format: string | null;
      lookup_latency_ms: number;
      requestId: string;
    }
  | {
      outcome: 'off_miss';
      format: string | null;
      lookup_latency_ms: number;
      requestId: string;
    }
  | {
      outcome: 'rate_limit_exceeded';
      current: number;
      limit: number;
      requestId: string;
    };
