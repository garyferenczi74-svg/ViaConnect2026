// Prompt #94 Phase 4.5: Admin cohort revenue curve API route.
//
// GET /api/admin/analytics/cohort/revenue
//   ?cohort=YYYY-MM-01     required
//   &segment_type=overall|channel|archetype|practitioner_attached|tier
//   &segment_value=...     required when segment_type != overall
//   &horizon=24            default 24
//
// Admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { computeRevenueCurve } from '@/lib/analytics/cohort-engine';
import { loadCohortBuckets } from '@/lib/analytics/cohort-bucket-loader';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const querySchema = z.object({
  cohort: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  segment_type: z.enum(['overall', 'channel', 'archetype', 'practitioner_attached', 'tier']).default('overall'),
  segment_value: z.string().optional(),
  horizon: z.coerce.number().int().min(1).max(60).default(24),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.analytics.cohort.revenue.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profileRes = await withTimeout(
      (async () => (supabase as any)
        .from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.analytics.cohort.revenue.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      cohort: url.searchParams.get('cohort') ?? '',
      segment_type: url.searchParams.get('segment_type') ?? 'overall',
      segment_value: url.searchParams.get('segment_value') ?? undefined,
      horizon: url.searchParams.get('horizon') ?? '24',
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }
    if (parsed.data.segment_type !== 'overall' && !parsed.data.segment_value) {
      return NextResponse.json({ error: 'segment_value required when segment_type is not overall' }, { status: 400 });
    }

    const cohortMonthIso = `${parsed.data.cohort.slice(0, 7)}-01`;
    const { cohortSize, buckets } = await loadCohortBuckets(
      {
        cohortMonthIso,
        segmentType: parsed.data.segment_type,
        segmentValue: parsed.data.segment_value,
      },
      supabase,
    );

    const result = computeRevenueCurve({
      cohortMonth: cohortMonthIso,
      cohortSize,
      buckets,
      horizonMonths: parsed.data.horizon,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.analytics.cohort.revenue', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.analytics.cohort.revenue', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
