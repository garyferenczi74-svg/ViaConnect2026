// Prompt #103 Phase 3: Per-review admin actions (approve / reject /
// request remediation). All transitions are logged with the admin
// actor id + timestamp.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

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
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.brand-compliance.detail.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.brand-compliance.detail.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const reviewRes = await withTimeout(
      (async () => sb
        .from('brand_compliance_reviews')
        .select('review_id, product_id, packaging_proof_path, detected_issues_json, severity, status, reviewer_notes, reviewed_at, created_at, products ( name, brand_id, product_category_id )')
        .eq('review_id', params.reviewId)
        .maybeSingle())(),
      8000,
      'api.brand-compliance.detail.load-review',
    );
    if (reviewRes.error || !reviewRes.data) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    return NextResponse.json({ review: reviewRes.data });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.brand-compliance.detail', 'database timeout', { reviewId: params.reviewId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.brand-compliance.detail', 'unexpected error', { reviewId: params.reviewId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { reviewId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.brand-compliance.action.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.brand-compliance.action.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
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

    const reviewRes = await withTimeout(
      (async () => sb
        .from('brand_compliance_reviews')
        .select('product_id, status')
        .eq('review_id', params.reviewId)
        .maybeSingle())(),
      8000,
      'api.brand-compliance.action.load-review',
    );
    const review = reviewRes.data;
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    if (review.status !== 'pending_human_review') {
      return NextResponse.json({ error: `Review is already ${review.status}; only pending_human_review can be actioned.` }, { status: 409 });
    }

    const updateRes = await withTimeout(
      (async () => sb
        .from('brand_compliance_reviews')
        .update({
          status: nextStatus,
          reviewer_id: user.id,
          reviewer_notes: notes,
          reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('review_id', params.reviewId))(),
      8000,
      'api.brand-compliance.action.update-review',
    );
    if (updateRes.error) return NextResponse.json({ error: updateRes.error.message }, { status: 500 });

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
    await withTimeout(
      (async () => sb.from('products').update(productUpdate).eq('id', review.product_id))(),
      8000,
      'api.brand-compliance.action.update-product',
    );

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.brand-compliance.action', 'database timeout', { reviewId: params.reviewId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.brand-compliance.action', 'unexpected error', { reviewId: params.reviewId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
