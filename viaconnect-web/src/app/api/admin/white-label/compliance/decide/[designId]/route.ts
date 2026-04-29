// Prompt #96 Phase 4: Reviewer decision.
//
// POST /api/admin/white-label/compliance/decide/[designId]
// Body: {
//   reviewer_role: 'compliance_officer' | 'medical_director',
//   decision: 'approved' | 'revision_requested' | 'rejected',
//   notes?: string,
//   flagged_items?: Array<{ field: string; reason: string }>
// }
//
// Inserts an immutable row into white_label_compliance_reviews, marks
// the reviewer assignment completed, and recomputes the approval gate.
// Updates design.status accordingly. When all required reviewers
// approve we also create the white_label_sku_mappings row that
// downstream adherence + interaction tracking depends on.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recomputeApprovalGate } from '@/lib/white-label/compliance-orchestrator';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  reviewer_role: z.enum(['compliance_officer', 'medical_director']),
  decision: z.enum(['approved', 'revision_requested', 'rejected']),
  notes: z.string().max(2000).optional(),
  flagged_items: z.array(z.object({
    field: z.string(),
    reason: z.string(),
  })).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { designId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.white-label.compliance-decide.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.white-label.compliance-decide.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    // Optional sanity check: reviewer must be assigned this role
    // (admins without role registration can still review; we just warn).
    const heldRes = await withTimeout(
      (async () => sb
        .from('white_label_compliance_reviewer_roles')
        .select('id').eq('user_id', user.id).eq('reviewer_role', parsed.data.reviewer_role).eq('is_active', true).maybeSingle())(),
      5000,
      'api.white-label.compliance-decide.check-role',
    );
    if (!heldRes.data) {
      safeLog.warn('api.white-label.compliance-decide', 'admin reviewing without role registration', { userId: user.id, reviewerRole: parsed.data.reviewer_role });
    }

    // Verify the design exists.
    const designRes = await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .select('id, status, structure_function_claims, practitioner_id, brand_configuration_id, product_catalog_id')
        .eq('id', params.designId)
        .maybeSingle())(),
      8000,
      'api.white-label.compliance-decide.load-design',
    );
    const design = designRes.data;
    if (!design) return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    if (design.status !== 'under_compliance_review') {
      return NextResponse.json({ error: `Design status ${design.status} does not accept reviews` }, { status: 400 });
    }

    const reviewType = parsed.data.reviewer_role === 'compliance_officer'
      ? 'compliance_review'
      : 'medical_claims_review';

    const insertRes = await withTimeout(
      (async () => sb
        .from('white_label_compliance_reviews')
        .insert({
          label_design_id: params.designId,
          review_type: reviewType,
          reviewer_role: parsed.data.reviewer_role,
          reviewer_user_id: user.id,
          decision: parsed.data.decision,
          decision_notes: parsed.data.notes ?? null,
          flagged_items: parsed.data.flagged_items ?? [],
        })
        .select('id')
        .maybeSingle())(),
      8000,
      'api.white-label.compliance-decide.insert-review',
    );
    if (insertRes.error) {
      return NextResponse.json({ error: 'Review insert failed', details: insertRes.error.message }, { status: 500 });
    }
    const review = insertRes.data;

    // Mark this assignment completed.
    await withTimeout(
      (async () => sb
        .from('white_label_reviewer_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('label_design_id', params.designId)
        .eq('reviewer_role', parsed.data.reviewer_role))(),
      8000,
      'api.white-label.compliance-decide.update-assignment',
    );

    // Recompute the approval gate from the immutable review log.
    const gate = await recomputeApprovalGate(params.designId, { supabase });

    // Translate gate outcome to label_design.status.
    const nextStatus = gate.next_status === 'approved'
      ? 'approved'
      : gate.next_status === 'rejected'
        ? 'archived'
        : gate.next_status === 'revision_requested'
          ? 'revision_requested'
          : 'under_compliance_review';

    await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', params.designId))(),
      8000,
      'api.white-label.compliance-decide.update-status',
    );

    // On full approval, create the SKU mapping for adherence tracking.
    if (gate.next_status === 'approved') {
      await withTimeout(
        (async () => sb
          .from('white_label_sku_mappings')
          .upsert({
            label_design_id: params.designId,
            practitioner_id: design.practitioner_id,
            underlying_viacura_product_id: design.product_catalog_id,
            practitioner_sku_code: `WL-${params.designId.slice(0, 8)}`,
            display_name: '', // populated from label later
            is_active: true,
          }, { onConflict: 'label_design_id' }))(),
        8000,
        'api.white-label.compliance-decide.upsert-sku',
      );
    }

    return NextResponse.json({
      review_id: review?.id ?? null,
      next_status: nextStatus,
      gate_outcome: gate.next_status,
      awaiting_reviewer_roles: gate.awaiting_reviewer_roles,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.compliance-decide', 'database timeout', { designId: params.designId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.compliance-decide', 'unexpected error', { designId: params.designId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
