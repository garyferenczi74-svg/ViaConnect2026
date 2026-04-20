// Prompt #97 Phase 4.3: record Steve Rica's regulatory review decision.
// POST /api/admin/custom-formulations/[id]/regulatory-review

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';
import { applyReviewDecision } from '@/lib/custom-formulations/review-state-machine';
import type { FormulationStatus, ReviewDecision } from '@/types/custom-formulations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireCustomFormulationsAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        decision?: ReviewDecision;
        decision_notes?: string;
        ndi_status_verified?: boolean;
        label_claim_language_verified?: boolean;
        prohibited_category_check_passed?: boolean;
        allergen_statement_verified?: boolean;
        fda_disclaimer_required?: boolean;
        manufacturer_of_record_verified?: boolean;
        revision_items?: unknown[];
      }
    | null;

  if (!body?.decision || !body.decision_notes) {
    return NextResponse.json(
      { error: 'decision and decision_notes required' },
      { status: 400 },
    );
  }
  if (!['approved', 'revision_requested', 'rejected'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }
  if (body.decision_notes.trim().length < 100) {
    return NextResponse.json(
      { error: 'decision_notes must be at least 100 characters' },
      { status: 400 },
    );
  }
  // prohibited_category_check_passed is NOT NULL at the DB level.
  if (body.prohibited_category_check_passed === undefined) {
    return NextResponse.json(
      { error: 'prohibited_category_check_passed is required' },
      { status: 400 },
    );
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('custom_formulations')
    .select('id, status, medical_review_id, regulatory_review_id')
    .eq('id', params.id)
    .maybeSingle();
  const row = existing as
    | {
        id: string;
        status: FormulationStatus;
        medical_review_id: string | null;
        regulatory_review_id: string | null;
      }
    | null;
  if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });

  if (row.regulatory_review_id) {
    return NextResponse.json(
      { error: 'Regulatory review already recorded for this formulation version' },
      { status: 409 },
    );
  }

  let medicalDecision: ReviewDecision | null = null;
  if (row.medical_review_id) {
    const { data: med } = await supabase
      .from('custom_formulation_medical_reviews')
      .select('decision')
      .eq('id', row.medical_review_id)
      .maybeSingle();
    medicalDecision = ((med as { decision: ReviewDecision } | null)?.decision) ?? null;
  }

  const transition = applyReviewDecision(
    {
      formulationStatus: row.status,
      medical: medicalDecision,
      regulatory: null,
    },
    'regulatory',
    body.decision,
  );
  if (transition.kind === 'error') {
    return NextResponse.json({ error: transition.reason }, { status: 409 });
  }

  const { data: reviewInsert, error: reviewErr } = await supabase
    .from('custom_formulation_regulatory_reviews')
    .insert({
      custom_formulation_id: params.id,
      reviewer_user_id: auth.userId,
      decision: body.decision,
      decision_notes: body.decision_notes.trim(),
      ndi_status_verified: body.ndi_status_verified ?? null,
      label_claim_language_verified: body.label_claim_language_verified ?? null,
      prohibited_category_check_passed: body.prohibited_category_check_passed,
      allergen_statement_verified: body.allergen_statement_verified ?? null,
      fda_disclaimer_required: body.fda_disclaimer_required ?? null,
      manufacturer_of_record_verified: body.manufacturer_of_record_verified ?? null,
      revision_items: (body.revision_items ?? []) as never,
    } as never)
    .select('id')
    .single();
  if (reviewErr || !reviewInsert) {
    return NextResponse.json({ error: reviewErr?.message ?? 'Insert failed' }, { status: 500 });
  }

  const updates: Record<string, unknown> = {
    regulatory_review_id: (reviewInsert as { id: string }).id,
    updated_at: new Date().toISOString(),
  };
  if (transition.kind === 'advance') {
    updates.status = transition.next;
    if (transition.next === 'approved_pending_development_fee') {
      updates.approved_at = new Date().toISOString();
    }
  }

  await supabase.from('custom_formulations').update(updates as never).eq('id', params.id);

  return NextResponse.json({
    ok: true,
    review_id: (reviewInsert as { id: string }).id,
    new_status: transition.kind === 'advance' ? transition.next : row.status,
    transition: transition.reason,
  });
}
