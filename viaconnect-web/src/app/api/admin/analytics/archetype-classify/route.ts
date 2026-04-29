// Prompt #94 Phase 5: Admin classify-user API.
//
// POST /api/admin/analytics/archetype-classify
//   { user_id: UUID, include_behavior?: boolean }
//
// Reads the user's most recent CAQ + (optionally) behavioral signals,
// runs the rule-based classifier, and writes the result to
// customer_archetypes. The is_primary swap is done in a CTE so we never
// momentarily violate uq_customer_archetypes_one_primary.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { classifyUserById } from '@/lib/analytics/archetype-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const bodySchema = z.object({
  user_id: z.string().uuid(),
  include_behavior: z.boolean().default(false),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.analytics.archetype-classify.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profileRes = await withTimeout(
      (async () => (supabase as any)
        .from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.analytics.archetype-classify.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const result = await classifyUserById(
      parsed.data.user_id,
      { includeBehavior: parsed.data.include_behavior },
      { supabase },
    );
    if (!result) {
      return NextResponse.json({ error: 'No completed CAQ for user' }, { status: 404 });
    }

    const sb = supabase as any;
    const assignedFrom = parsed.data.include_behavior ? 'caq_refined_with_behavior' : 'caq_initial';

    const rpcRes = await withTimeout(
      (async () => sb.rpc('assign_primary_archetype', {
        p_user_id: parsed.data.user_id,
        p_archetype_id: result.primary.archetype_id,
        p_confidence_score: result.confidence,
        p_assigned_from: assignedFrom,
        p_signal_payload: result.signal_payload,
      }))(),
      8000,
      'api.analytics.archetype-classify.rpc',
    );

    if (rpcRes.error) {
      return NextResponse.json(
        { error: 'Persist failed', details: rpcRes.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user_id: parsed.data.user_id,
      primary: result.primary,
      secondary: result.secondary,
      confidence: result.confidence,
      assigned_from: assignedFrom,
      customer_archetype_id: rpcRes.data ?? null,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.analytics.archetype-classify', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.analytics.archetype-classify', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
