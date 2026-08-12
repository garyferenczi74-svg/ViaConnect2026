/**
 * Prompt 170o Phase 1 Phase B: hydration target update endpoint.
 *
 * PUT a custom hydration target (500-6000 ml) or null to clear and revert
 * to the computed default. Returns the new effective target after activity,
 * climate, and pregnancy/lactation adjustments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { TargetUpdateSchema } from '@/lib/nutrition/hydration/types';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest): Promise<NextResponse> {
  // Prompt 177m (2026-06-09): 170o launch gate removed (see quick-log).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TargetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ hydration_target_ml_per_day_custom: parsed.data.custom_target_ml_per_day })
    .eq('id', user.id);

  if (updateErr) {
    safeLog.warn('api.hydration.target', 'profile update failed', { error: updateErr, userId: user.id });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { data: profileRow } = await admin
    .from('profiles')
    .select('body_weight_kg, hydration_target_ml_per_day_custom')
    .eq('id', user.id)
    .maybeSingle();

  const effectiveTarget = personalizeHydrationTarget({
    body_weight_kg: profileRow?.body_weight_kg ?? null,
    custom_target_ml_per_day: profileRow?.hydration_target_ml_per_day_custom ?? null,
  });

  return NextResponse.json({
    custom_target_ml_per_day: parsed.data.custom_target_ml_per_day,
    effective_target_ml: effectiveTarget,
  });
}
