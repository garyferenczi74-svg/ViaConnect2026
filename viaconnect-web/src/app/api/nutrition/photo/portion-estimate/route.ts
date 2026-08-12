// Prompt #170 Phase 1j: POST /api/nutrition/photo/portion-estimate.
//
// Portion-only endpoint. The UI uses this when the user adjusts the portion
// slider after the initial draft from /api/nutrition/photo/analyze. Returns
// a PortionEstimate from @/lib/nutrition/portion/types.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { newRequestId } from '@/lib/observability/audit-recorder';

import { estimatePortion } from '@/lib/nutrition/portion/volume-estimate';
import type { ReferenceObjectKind, ReferenceObject } from '@/lib/nutrition/portion/types';
import type { VisionItem, BoundingBox } from '@/lib/nutrition/vision/types';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/nutrition/photo/portion-estimate';

const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().nonnegative(),
  h: z.number().nonnegative(),
});

const PortionEstimateRequestSchema = z.object({
  food_name: z.string().min(1).max(200),
  bounding_box: BoundingBoxSchema,
  portion_grams_hint: z.number().nonnegative().max(5000).nullable().optional(),
  portion_volume_ml_hint: z.number().nonnegative().max(5000).nullable().optional(),
  reference: z
    .object({
      // #170a supplement §17: standard_fork dropped, plate_8in added.
      kind: z.enum(['credit_card', 'plate_8in', 'plate_10in', 'plate_12in']),
      bounding_box: BoundingBoxSchema,
    })
    .nullable()
    .optional(),
  depth_to_height_ratio: z.number().positive().max(2).optional(),
});

// Real-world longest dimension by reference kind. Sourced from spec §1.4d
// (Phase 1f reference-objects table), updated per #170a supplement §17.
const REF_LONGEST_MM: Record<ReferenceObjectKind, number> = {
  credit_card: 85.60,
  plate_8in: 203,
  plate_10in: 254,
  plate_12in: 305,
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AIRouteError(
        'UNAUTHENTICATED',
        'no session',
        401,
        'Please sign in to estimate portions.',
      );
    }
    userId = user.id;

    const body = await req.json().catch(() => null);
    const parsed = PortionEstimateRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'bad body',
        400,
        'A valid food name, bounding box, and optional reference are required.',
      );
    }
    const payload = parsed.data;

    // Adapt the payload into the lib's input shape. estimatePortion expects a
    // VisionItem-like minimum (foodName, boundingBox, optional grams hint, etc.).
    const item: Pick<
      VisionItem,
      'foodName' | 'boundingBox' | 'portionGramsHint' | 'portionVolumeMlHint'
    > = {
      foodName: payload.food_name,
      boundingBox: payload.bounding_box as BoundingBox,
    };
    if (typeof payload.portion_grams_hint === 'number') {
      item.portionGramsHint = payload.portion_grams_hint;
    }
    if (typeof payload.portion_volume_ml_hint === 'number') {
      item.portionVolumeMlHint = payload.portion_volume_ml_hint;
    }

    let reference: ReferenceObject | undefined;
    if (payload.reference) {
      reference = {
        kind: payload.reference.kind,
        boundingBox: payload.reference.bounding_box as BoundingBox,
        realWorldLongestMm: REF_LONGEST_MM[payload.reference.kind],
      };
    }

    const estimate = estimatePortion({
      item,
      reference,
      depthToHeightRatio: payload.depth_to_height_ratio,
    });

    safeLog.info('api.nutrivision.photo.portion-estimate', 'estimate ok', {
      request_id: requestId,
      user_id: user.id,
      method: estimate.method,
      grams: estimate.grams,
      confidence: estimate.confidence,
    });

    return NextResponse.json({ estimate, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrivision.photo.portion-estimate', 'failure', {
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
