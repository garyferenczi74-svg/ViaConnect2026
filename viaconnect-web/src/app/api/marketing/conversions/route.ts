// Prompt #138a Phase 3 — public conversion endpoint.
//
// POST /api/marketing/conversions
// Body: { visitor_id, conversion_kind, preceding_slot_id?, time_from_impression_seconds? }
//
// Anonymous-allowed. Records caq_start, signup_complete, and bounce events
// joined to the most recent impression in the same browsing session window.
// RLS allows insert for anon + authenticated; admin-only read.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordConversion } from '@/lib/marketing/variants/conversion';
import type { ConversionKind } from '@/lib/marketing/variants/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const VALID_KINDS: ConversionKind[] = ['caq_start', 'signup_complete', 'bounce'];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    visitor_id?: string;
    conversion_kind?: string;
    preceding_slot_id?: string;
    time_from_impression_seconds?: number;
  } | null;

  if (!body?.visitor_id || !body.conversion_kind) {
    return NextResponse.json({ error: 'visitor_id and conversion_kind required' }, { status: 400 });
  }
  if (!VALID_KINDS.includes(body.conversion_kind as ConversionKind)) {
    return NextResponse.json({ error: 'Invalid conversion_kind' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const result = await withTimeout(
      recordConversion(supabase, {
        visitorId: body.visitor_id,
        conversionKind: body.conversion_kind as ConversionKind,
        precedingSlotId: body.preceding_slot_id,
        timeFromImpressionSeconds: body.time_from_impression_seconds,
      }),
      8000,
      'api.marketing.conversions.record',
    );

    return NextResponse.json({
      ok: result.ok,
      precedingSlotId: result.precedingSlotId,
      timeFromImpressionSeconds: result.timeFromImpressionSeconds,
    });
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn('api.marketing.conversions', 'record timeout', { error: err });
    else safeLog.warn('api.marketing.conversions', 'record failed', { error: err });
    return NextResponse.json({ ok: false, stale: true });
  }
}
