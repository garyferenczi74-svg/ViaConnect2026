// Prompt #94 Phase 3.6: Admin LTV API route.
//
// GET /api/admin/analytics/ltv
//   ?cohort=YYYY-MM-01      (required, normalized to first of month)
//   &segment_type=overall|tier|archetype|channel|practitioner_attached (default overall)
//   &segment_value=<value>  (required when segment_type != overall)
//   &horizons=12,24,36      (optional, default 12,24,36)
//
// Admin-only. Wraps buildCohortLTV.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildCohortLTV } from '@/lib/analytics/ltv-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const segmentSchema = z.enum([
  'overall', 'tier', 'archetype', 'channel', 'practitioner_attached',
]);

const querySchema = z.object({
  cohort: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'cohort must be YYYY-MM-DD'),
  segment_type: segmentSchema.default('overall'),
  segment_value: z.string().optional(),
  horizons: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.analytics.ltv.auth');
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profileRes = await withTimeout(
      (async () => (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle())(),
      5000,
      'api.analytics.ltv.load-profile',
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
      horizons: url.searchParams.get('horizons') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const segmentType = parsed.data.segment_type;
    if (segmentType !== 'overall' && !parsed.data.segment_value) {
      return NextResponse.json(
        { error: 'segment_value required when segment_type is not overall' },
        { status: 400 },
      );
    }

    const horizons = parsed.data.horizons
      ? parsed.data.horizons
          .split(',')
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [12, 24, 36];

    const cohortMonthIso = `${parsed.data.cohort.slice(0, 7)}-01`;
    const segmentValue = segmentType === 'overall' ? 'all' : (parsed.data.segment_value ?? 'all');

    const result = await buildCohortLTV(
      {
        cohortMonthIso,
        segmentType,
        segmentValue,
        horizons,
      },
      { supabase },
    );

    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.analytics.ltv', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.analytics.ltv', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
