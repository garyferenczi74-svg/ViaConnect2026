// Prompt #94 Phase 4.5: Admin cohort comparison API route.
//
// GET /api/admin/analytics/cohort/compare
//   ?cohorts=YYYY-MM-01,YYYY-MM-01,YYYY-MM-01   required, 2 to 12 cohorts
//   &segment_type=overall|channel|archetype|practitioner_attached|tier
//   &segment_value=...    applied uniformly to every cohort
//   &active=strict|standard|loose                 default strict
//   &horizon=24                                    default 24
//
// Admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { compareCohorts, ACTIVE_DEFINITIONS } from '@/lib/analytics/cohort-engine';
import { loadCohortBuckets } from '@/lib/analytics/cohort-bucket-loader';

export const runtime = 'nodejs';

const querySchema = z.object({
  cohorts: z.string()
    .transform((s) => s.split(',').map((c) => c.trim()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(2).max(12)),
  segment_type: z.enum(['overall', 'channel', 'archetype', 'practitioner_attached', 'tier']).default('overall'),
  segment_value: z.string().optional(),
  active: z.enum(ACTIVE_DEFINITIONS).default('strict'),
  horizon: z.coerce.number().int().min(1).max(60).default(24),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    cohorts: url.searchParams.get('cohorts') ?? '',
    segment_type: url.searchParams.get('segment_type') ?? 'overall',
    segment_value: url.searchParams.get('segment_value') ?? undefined,
    active: url.searchParams.get('active') ?? 'strict',
    horizon: url.searchParams.get('horizon') ?? '24',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.segment_type !== 'overall' && !parsed.data.segment_value) {
    return NextResponse.json({ error: 'segment_value required when segment_type is not overall' }, { status: 400 });
  }

  const segmentDescriptor = parsed.data.segment_type === 'overall'
    ? 'overall'
    : `${parsed.data.segment_type}=${parsed.data.segment_value}`;

  const loaded = await Promise.all(
    parsed.data.cohorts.map(async (cohort) => {
      const cohortMonthIso = `${cohort.slice(0, 7)}-01`;
      const { cohortSize, buckets } = await loadCohortBuckets(
        {
          cohortMonthIso,
          segmentType: parsed.data.segment_type,
          segmentValue: parsed.data.segment_value,
        },
        supabase,
      );
      return {
        cohortMonth: cohortMonthIso,
        segmentDescriptor: `${cohortMonthIso} ${segmentDescriptor}`,
        cohortSize,
        buckets,
        horizonMonths: parsed.data.horizon,
        ltv24moCents: 0, // populated in dashboard layer from LTV API
      };
    }),
  );

  const result = compareCohorts({
    cohorts: loaded,
    activeDefinition: parsed.data.active,
  });

  return NextResponse.json(result);
}
