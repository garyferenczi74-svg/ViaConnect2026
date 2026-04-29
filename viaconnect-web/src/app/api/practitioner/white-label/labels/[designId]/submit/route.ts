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
//
// Prompt #140b Layer 3 hardening: timeouts on Supabase + orchestrator,
// safeLog instrumentation.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  runAutomatedComplianceChecklist,
  openReviewerAssignments,
} from '@/lib/white-label/compliance-orchestrator';
import { determineRequiredReviewers } from '@/lib/white-label/compliance';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { designId: string } },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.labels.submit.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.labels.submit', 'auth timeout', { requestId, designId: params.designId, error: err });
        return NextResponse.json({ error: 'Authentication check timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;

    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.labels.submit.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const designRes = await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .select('id, practitioner_id, status, structure_function_claims, brand_configuration_id')
        .eq('id', params.designId)
        .maybeSingle())(),
      8000,
      'api.white-label.labels.submit.design-load',
    );
    const design = designRes.data;
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

    const brandRes = await withTimeout(
      (async () => sb
        .from('practitioner_brand_configurations')
        .select('brand_config_approved')
        .eq('id', design.brand_configuration_id)
        .maybeSingle())(),
      8000,
      'api.white-label.labels.submit.brand-load',
    );
    const brand = brandRes.data;
    if (!brand?.brand_config_approved) {
      return NextResponse.json(
        { error: 'Brand must be admin-approved before submitting any label.' },
        { status: 403 },
      );
    }

    let result, review_id;
    try {
      const checklistOut = await withTimeout(
        runAutomatedComplianceChecklist(params.designId, { supabase }),
        20000,
        'api.white-label.labels.submit.checklist',
      );
      result = checklistOut.result;
      review_id = checklistOut.review_id;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.labels.submit', 'checklist timeout', { requestId, designId: params.designId, error: err });
        return NextResponse.json({ error: 'Compliance checklist took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    if (!result.overall_passed) {
      await withTimeout(
        (async () => sb
          .from('white_label_label_designs')
          .update({ status: 'revision_requested', updated_at: new Date().toISOString() })
          .eq('id', params.designId))(),
        8000,
        'api.white-label.labels.submit.status-revision',
      );
      safeLog.info('api.white-label.labels.submit', 'checklist failed', { requestId, designId: params.designId, blockerCount: result.blocker_failures?.length ?? 0 });
      return NextResponse.json({
        ok: false,
        reason: 'automated_checklist_failed',
        blocker_failures: result.blocker_failures,
        warning_failures: result.warning_failures,
        review_id,
      }, { status: 422 });
    }

    const required = determineRequiredReviewers(design.structure_function_claims ?? []);
    await withTimeout(
      openReviewerAssignments(params.designId, required, { supabase }),
      10000,
      'api.white-label.labels.submit.open-assignments',
    );

    await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .update({ status: 'under_compliance_review', updated_at: new Date().toISOString() })
        .eq('id', params.designId))(),
      8000,
      'api.white-label.labels.submit.status-review',
    );

    safeLog.info('api.white-label.labels.submit', 'submitted for review', { requestId, designId: params.designId, requiredReviewers: required.length });
    return NextResponse.json({
      ok: true,
      automated_review_id: review_id,
      required_reviewer_roles: required,
      warning_failures: result.warning_failures,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.labels.submit', 'database timeout', { requestId, designId: params.designId, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.white-label.labels.submit', 'unexpected error', { requestId, designId: params.designId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
