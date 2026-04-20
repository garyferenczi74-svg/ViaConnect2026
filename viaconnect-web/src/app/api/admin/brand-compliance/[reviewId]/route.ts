// Prompt #103 Phase 3: Per-review admin actions (approve / reject /
// request remediation). All transitions are logged with the admin
// actor id + timestamp.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Action = 'approve' | 'reject' | 'request_remediation';

const ACTION_TO_STATUS: Record<Action, 'approved' | 'rejected' | 'remediation_required'> = {
  approve:            'approved',
  reject:             'rejected',
  request_remediation:'remediation_required',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { reviewId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data: review, error } = await sb
    .from('brand_compliance_reviews')
    .select('review_id, product_id, packaging_proof_path, detected_issues_json, severity, status, reviewer_notes, reviewed_at, created_at, products ( name, brand_id, product_category_id )')
    .eq('review_id', params.reviewId)
    .maybeSingle();
  if (error || !review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  return NextResponse.json({ review });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { reviewId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const action = body.action as Action | undefined;
  const notes = typeof body.notes === 'string' ? body.notes : null;

  if (!action || !(action in ACTION_TO_STATUS)) {
    return NextResponse.json({ error: 'action must be approve, reject, or request_remediation' }, { status: 400 });
  }

  const nextStatus = ACTION_TO_STATUS[action];
  const nowIso = new Date().toISOString();

  const { data: review } = await sb
    .from('brand_compliance_reviews')
    .select('product_id, status')
    .eq('review_id', params.reviewId)
    .maybeSingle();
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  if (review.status !== 'pending_human_review') {
    return NextResponse.json({ error: `Review is already ${review.status}; only pending_human_review can be actioned.` }, { status: 409 });
  }

  const { error: rErr } = await sb
    .from('brand_compliance_reviews')
    .update({
      status: nextStatus,
      reviewer_id: user.id,
      reviewer_notes: notes,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('review_id', params.reviewId);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const productUpdate: Record<string, unknown> = { updated_at: nowIso };
  if (action === 'approve') {
    productUpdate.brand_compliance_status = 'approved';
    productUpdate.brand_compliance_reviewed_at = nowIso;
    productUpdate.brand_compliance_reviewed_by = user.id;
  } else if (action === 'reject') {
    productUpdate.brand_compliance_status = 'rejected';
  } else {
    productUpdate.brand_compliance_status = 'flagged';
  }
  await sb.from('products').update(productUpdate).eq('id', review.product_id);

  return NextResponse.json({ ok: true, status: nextStatus });
}
