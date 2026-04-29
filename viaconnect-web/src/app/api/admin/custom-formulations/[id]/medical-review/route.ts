// Prompt #97 Phase 4.2: record Fadi Dagher's medical review decision.
// POST /api/admin/custom-formulations/[id]/medical-review
// Body: { decision, decision_notes (>=100 chars), clinical_appropriateness_assessment?,
//         dose_appropriateness_assessment?, interaction_concerns?, intended_use_concerns?,
//         revision_items? }
//
// Prompt #140b Layer 3 hardening: timeouts on every Supabase call,
// safeLog instrumentation.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';
import { applyReviewDecision } from '@/lib/custom-formulations/review-state-machine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { FormulationStatus, ReviewDecision } from '@/types/custom-formulations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await requireCustomFormulationsAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | {
          decision?: ReviewDecision;
          decision_notes?: string;
          clinical_appropriateness_assessment?: string;
          dose_appropriateness_assessment?: string;
          interaction_concerns?: string;
          intended_use_concerns?: string;
          revision_items?: unknown[];
        }
      | null;

    if (!body?.decision || !body.decision_notes) {
      return NextResponse.json(
        { error: 'decision and decision_notes required' },
        { status: 400 },
      );
    }
    const decision = body.decision;
    const decisionNotes = body.decision_notes;
    if (!['approved', 'revision_requested', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }
    if (decisionNotes.trim().length < 100) {
      return NextResponse.json(
        { error: 'decision_notes must be at least 100 characters' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const existingRes = await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .select('id, status, medical_review_id, regulatory_review_id')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.custom-formulations.medical-review.load',
    );
    const existing = existingRes.data;
    const row = existing as
      | { id: string; status: FormulationStatus; medical_review_id: string | null; regulatory_review_id: string | null }
      | null;
    if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });

    if (row.medical_review_id) {
      return NextResponse.json(
        { error: 'Medical review already recorded for this formulation version' },
        { status: 409 },
      );
    }

    let regulatoryDecision: ReviewDecision | null = null;
    if (row.regulatory_review_id) {
      const regId = row.regulatory_review_id;
      const regRes = await withTimeout(
        (async () => supabase
          .from('custom_formulation_regulatory_reviews')
          .select('decision')
          .eq('id', regId)
          .maybeSingle())(),
        5000,
        'api.custom-formulations.medical-review.load-regulatory',
      );
      regulatoryDecision = ((regRes.data as { decision: ReviewDecision } | null)?.decision) ?? null;
    }

    const transition = applyReviewDecision(
      {
        formulationStatus: row.status,
        medical: null,
        regulatory: regulatoryDecision,
      },
      'medical',
      decision,
    );

    if (transition.kind === 'error') {
      return NextResponse.json({ error: transition.reason }, { status: 409 });
    }

    const reviewRes = await withTimeout(
      (async () => supabase
        .from('custom_formulation_medical_reviews')
        .insert({
          custom_formulation_id: params.id,
          reviewer_user_id: auth.userId,
          decision: decision,
          decision_notes: decisionNotes.trim(),
          clinical_appropriateness_assessment: body.clinical_appropriateness_assessment ?? null,
          dose_appropriateness_assessment: body.dose_appropriateness_assessment ?? null,
          interaction_concerns: body.interaction_concerns ?? null,
          intended_use_concerns: body.intended_use_concerns ?? null,
          revision_items: (body.revision_items ?? []) as never,
        } as never)
        .select('id')
        .single())(),
      8000,
      'api.custom-formulations.medical-review.insert',
    );
    const reviewInsert = reviewRes.data;
    const reviewErr = reviewRes.error;
    if (reviewErr || !reviewInsert) {
      safeLog.error('api.custom-formulations.medical-review', 'insert failed', { requestId, formulationId: params.id, error: reviewErr });
      return NextResponse.json({ error: reviewErr?.message ?? 'Insert failed' }, { status: 500 });
    }

    const updates: Record<string, unknown> = {
      medical_review_id: (reviewInsert as { id: string }).id,
      updated_at: new Date().toISOString(),
    };
    if (transition.kind === 'advance') {
      updates.status = transition.next;
      if (transition.next === 'approved_pending_development_fee') {
        updates.approved_at = new Date().toISOString();
      }
    }

    await withTimeout(
      (async () => supabase.from('custom_formulations').update(updates as never).eq('id', params.id))(),
      8000,
      'api.custom-formulations.medical-review.update',
    );

    safeLog.info('api.custom-formulations.medical-review', 'review recorded', {
      requestId, formulationId: params.id, decision, newStatus: transition.kind === 'advance' ? transition.next : row.status,
    });

    return NextResponse.json({
      ok: true,
      review_id: (reviewInsert as { id: string }).id,
      new_status: transition.kind === 'advance' ? transition.next : row.status,
      transition: transition.reason,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.custom-formulations.medical-review', 'database timeout', { requestId, formulationId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.custom-formulations.medical-review', 'unexpected error', { requestId, formulationId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
