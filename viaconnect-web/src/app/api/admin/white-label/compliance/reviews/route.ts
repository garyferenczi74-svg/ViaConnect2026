// Prompt #96 Phase 4: Admin read of compliance review log for one design.
//
// GET /api/admin/white-label/compliance/reviews?design_id=...

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const designId = new URL(request.url).searchParams.get('design_id');
  if (!designId) return NextResponse.json({ error: 'design_id required' }, { status: 400 });

  const { data, error } = await sb
    .from('white_label_compliance_reviews')
    .select('id, review_type, reviewer_role, reviewer_user_id, decision, decision_notes, checklist_results, flagged_items, reviewed_at')
    .eq('label_design_id', designId)
    .order('reviewed_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reviews: data ?? [] });
}
