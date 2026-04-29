// Prompt #96 Phase 4: Admin read of compliance review log for one design.
//
// GET /api/admin/white-label/compliance/reviews?design_id=...

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.white-label.compliance-reviews.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.white-label.compliance-reviews.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const designId = new URL(request.url).searchParams.get('design_id');
    if (!designId) return NextResponse.json({ error: 'design_id required' }, { status: 400 });

    const { data, error } = await withTimeout(
      (async () => sb
        .from('white_label_compliance_reviews')
        .select('id, review_type, reviewer_role, reviewer_user_id, decision, decision_notes, checklist_results, flagged_items, reviewed_at')
        .eq('label_design_id', designId)
        .order('reviewed_at', { ascending: false }))(),
      8000,
      'api.white-label.compliance-reviews.list',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ reviews: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.compliance-reviews', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.compliance-reviews', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
