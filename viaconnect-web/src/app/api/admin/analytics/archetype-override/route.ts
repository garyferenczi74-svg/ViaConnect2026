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

export const runtime = 'nodejs';

const bodySchema = z.object({
  user_id: z.string().uuid(),
  archetype_id: z.enum(ARCHETYPE_IDS),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;

  const { data: existingPrimary } = await sb
    .from('customer_archetypes')
    .select('id, archetype_id, signal_payload')
    .eq('user_id', parsed.data.user_id)
    .eq('is_primary', true)
    .maybeSingle();

  const overridePayload = {
    manual_override: true,
    overridden_by: user.id,
    overridden_at: new Date().toISOString(),
    reason: parsed.data.reason ?? null,
    previous_archetype_id: existingPrimary?.archetype_id ?? null,
  };

  if (existingPrimary) {
    await sb
      .from('customer_archetypes')
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq('id', existingPrimary.id);
  }

  const { data: inserted, error: insertError } = await sb
    .from('customer_archetypes')
    .insert({
      user_id: parsed.data.user_id,
      archetype_id: parsed.data.archetype_id,
      confidence_score: 1.0,
      assigned_from: 'manual_admin_override',
      signal_payload: overridePayload,
      is_primary: true,
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: 'Override insert failed', details: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: parsed.data.user_id,
    archetype_id: parsed.data.archetype_id,
    assigned_from: 'manual_admin_override',
    customer_archetype_id: inserted?.id ?? null,
    previous_archetype_id: existingPrimary?.archetype_id ?? null,
  });
}
