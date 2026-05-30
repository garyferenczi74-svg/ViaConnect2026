/**
 * Prompt 170l Phase 1c-3: OFF contribution click Helix event endpoint.
 *
 * Fires the barcode_off_contribution_clicked Helix event (3pt) when the
 * user clicks the "Help everyone find this product" card on §11.5 not-found
 * fallback. Decoupled from meal-save because the contribution click is its
 * own lifecycle (the user is leaving ViaConnect to contribute on OFF).
 *
 * Returns { awarded: boolean } so the client can confirm but does not surface
 * the points themselves per Standing Rule #8 (consumer-only Helix events).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { newRequestId } from '@/lib/observability/audit-recorder';
import { awardOffContributionClicked } from '@/lib/nutrition/helix-bridge';

const ROUTE = '/api/nutrition/barcode/contribution';

const RequestSchema = z.object({
  barcode: z.string().min(8).max(14),
});

export async function POST(request: Request): Promise<NextResponse> {
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
        'Please sign in.',
      );
    }
    userId = user.id;

    const body = await request.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'barcode missing or wrong length',
        400,
        'Barcode is required.',
      );
    }

    const supabaseAdmin = createAdminClient();
    const result = await awardOffContributionClicked({
      supabaseAdmin,
      userId,
      barcode: parsed.data.barcode,
      requestId,
    });

    safeLog.info('api.nutrition.barcode.contribution', 'contribution recorded', {
      request_id: requestId,
      user_id: userId,
      barcode: parsed.data.barcode,
      awarded: result.awarded,
    });

    return NextResponse.json({ awarded: result.awarded, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong.', err);
    safeLog.warn('api.nutrition.barcode.contribution', 'failure', {
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
