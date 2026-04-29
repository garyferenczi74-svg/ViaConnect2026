// Prompt #94 Phase 5: Admin manual archetype override.
//
// POST /api/admin/analytics/archetype-override
//   { user_id: UUID, archetype_id: ArchetypeId, reason?: string }
//
// Forces a user's primary archetype to the specified value with
// assigned_from='manual_admin_override'. The auto-refinement loop is
// expected to respect manual overrides and not flip them back; we mark
// signal_payload.manual_override=true so the refinement tick can skip.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ARCHETYPE_IDS } from '@/lib/analytics/archetype-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const bodySchema = z.object({
  user_id: z.string().uuid(),
  archetype_id: z.enum(ARCHETYPE_IDS),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.analytics.archetype-override.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profileRes = await withTimeout(
      (async () => (supabase as any)
        .from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.analytics.archetype-override.load-profile',
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

    const sb = supabase as any;

    const existingRes = await withTimeout(
      (async () => sb
        .from('customer_archetypes')
        .select('id, archetype_id')
        .eq('user_id', parsed.data.user_id)
        .eq('is_primary', true)
        .maybeSingle())(),
      8000,
      'api.analytics.archetype-override.load-existing',
    );
    const existingPrimary = existingRes.data;

    const overridePayload = {
      manual_override: true,
      overridden_by: user.id,
      overridden_at: new Date().toISOString(),
      reason: parsed.data.reason ?? null,
      previous_archetype_id: existingPrimary?.archetype_id ?? null,
    };

    const rpcRes = await withTimeout(
      (async () => sb.rpc('assign_primary_archetype', {
        p_user_id: parsed.data.user_id,
        p_archetype_id: parsed.data.archetype_id,
        p_confidence_score: 1.0,
        p_assigned_from: 'manual_admin_override',
        p_signal_payload: overridePayload,
      }))(),
      8000,
      'api.analytics.archetype-override.rpc',
    );

    if (rpcRes.error) {
      return NextResponse.json(
        { error: 'Override failed', details: rpcRes.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user_id: parsed.data.user_id,
      archetype_id: parsed.data.archetype_id,
      assigned_from: 'manual_admin_override',
      customer_archetype_id: rpcRes.data ?? null,
      previous_archetype_id: existingPrimary?.archetype_id ?? null,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.analytics.archetype-override', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.analytics.archetype-override', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
