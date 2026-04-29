// Prompt #138a Phase 3 — public impression endpoint.
//
// POST /api/marketing/impressions
// Body: { visitor_id, slot_id, viewport?, referrer?, is_returning_visitor? }
//
// Anonymous-allowed. Used by HeroVariantRenderer (Phase 4) to record each
// render. RLS allows insert for anon + authenticated; admin-only read.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordImpression, categorizeReferrer, viewportFromWidth } from '@/lib/marketing/variants/impression';
import type { Viewport } from '@/lib/marketing/variants/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    visitor_id?: string;
    slot_id?: string;
    viewport?: Viewport;
    viewport_width_px?: number;
    referrer?: string | null;
    is_returning_visitor?: boolean;
  } | null;

  if (!body?.visitor_id || !body.slot_id) {
    return NextResponse.json({ error: 'visitor_id and slot_id required' }, { status: 400 });
  }

  const viewport = body.viewport
    ?? (typeof body.viewport_width_px === 'number' ? viewportFromWidth(body.viewport_width_px) : undefined);
  const referrerCategory = categorizeReferrer(body.referrer ?? request.headers.get('referer'));

  try {
    const supabase = createClient();
    const result = await withTimeout(
      recordImpression(supabase, {
        visitorId: body.visitor_id,
        slotId: body.slot_id,
        viewport,
        referrerCategory,
        isReturningVisitor: body.is_returning_visitor,
      }),
      8000,
      'api.marketing.impressions.record',
    );

    return NextResponse.json({ ok: result.ok, attempts: result.attempts });
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn('api.marketing.impressions', 'record timeout', { error: err });
    else safeLog.warn('api.marketing.impressions', 'record failed', { error: err });
    return NextResponse.json({ ok: false, attempts: 0, stale: true });
  }
}
