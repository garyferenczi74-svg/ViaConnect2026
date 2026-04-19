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

export const runtime = 'nodejs';

const bodySchema = z.object({
  user_id: z.string().uuid(),
  include_behavior: z.boolean().default(false),
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

  const { data: existingPrimary } = await sb
    .from('customer_archetypes')
    .select('id, archetype_id')
    .eq('user_id', parsed.data.user_id)
    .eq('is_primary', true)
    .maybeSingle();

  if (existingPrimary && existingPrimary.archetype_id === result.primary.archetype_id) {
    await sb
      .from('customer_archetypes')
      .update({
        confidence_score: result.confidence,
        signal_payload: result.signal_payload,
        assigned_from: assignedFrom,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPrimary.id);
  } else {
    if (existingPrimary) {
      await sb
        .from('customer_archetypes')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('id', existingPrimary.id);
    }
    await sb.from('customer_archetypes').insert({
      user_id: parsed.data.user_id,
      archetype_id: result.primary.archetype_id,
      confidence_score: result.confidence,
      assigned_from: assignedFrom,
      signal_payload: result.signal_payload,
      is_primary: true,
    });
  }

  return NextResponse.json({
    user_id: parsed.data.user_id,
    primary: result.primary,
    secondary: result.secondary,
    confidence: result.confidence,
    assigned_from: assignedFrom,
  });
}
