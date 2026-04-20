// Prompt #96 Phase 4: Submit a label for compliance review.
//
// POST /api/practitioner/white-label/labels/[designId]/submit
//
// Flow:
//   1. Verify the caller owns the design and brand_config_approved=true.
//   2. Run the automated compliance checklist; persist to
//      white_label_compliance_reviews (immutable per Phase 1 trigger).
//   3. If automated check failed, set design.status = revision_requested
//      and return blocker failures so the practitioner can fix and
//      resubmit.
//   4. If automated check passed, open reviewer_assignments rows for
//      every required reviewer (compliance_officer always; medical_director
//      when claims present), set design.status = under_compliance_review.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  runAutomatedComplianceChecklist,
  openReviewerAssignments,
} from '@/lib/white-label/compliance-orchestrator';
import { determineRequiredReviewers } from '@/lib/white-label/compliance';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: { designId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const { data: design } = await sb
    .from('white_label_label_designs')
    .select('id, practitioner_id, status, structure_function_claims, brand_configuration_id')
    .eq('id', params.designId)
    .maybeSingle();
  if (!design) return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  if (design.practitioner_id !== practitioner.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!['draft', 'revision_requested'].includes(design.status)) {
    return NextResponse.json(
      { error: `Cannot submit a design in status ${design.status}` },
      { status: 400 },
    );
  }

  const { data: brand } = await sb
    .from('practitioner_brand_configurations')
    .select('brand_config_approved')
    .eq('id', design.brand_configuration_id)
    .maybeSingle();
  if (!brand?.brand_config_approved) {
    return NextResponse.json(
      { error: 'Brand must be admin-approved before submitting any label.' },
      { status: 403 },
    );
  }

  // Run the automated checklist + persist to compliance_reviews.
  const { result, review_id } = await runAutomatedComplianceChecklist(params.designId, { supabase });

  if (!result.overall_passed) {
    await sb
      .from('white_label_label_designs')
      .update({ status: 'revision_requested', updated_at: new Date().toISOString() })
      .eq('id', params.designId);
    return NextResponse.json({
      ok: false,
      reason: 'automated_checklist_failed',
      blocker_failures: result.blocker_failures,
      warning_failures: result.warning_failures,
      review_id,
    }, { status: 422 });
  }

  // Open reviewer assignments + advance status.
  const required = determineRequiredReviewers(design.structure_function_claims ?? []);
  await openReviewerAssignments(params.designId, required, { supabase });

  await sb
    .from('white_label_label_designs')
    .update({ status: 'under_compliance_review', updated_at: new Date().toISOString() })
    .eq('id', params.designId);

  return NextResponse.json({
    ok: true,
    automated_review_id: review_id,
    required_reviewer_roles: required,
    warning_failures: result.warning_failures,
  });
}
