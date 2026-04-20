// Prompt #97 Phase 4.2: record Fadi Dagher's medical review decision.
// POST /api/admin/custom-formulations/[id]/medical-review
// Body: { decision, decision_notes (>=100 chars), clinical_appropriateness_assessment?,
//         dose_appropriateness_assessment?, interaction_concerns?, intended_use_concerns?,
//         revision_items? }

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
  if (!['approved', 'revision_requested', 'rejected'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }
  if (body.decision_notes.trim().length < 100) {
    return NextResponse.json(
      { error: 'decision_notes must be at least 100 characters' },
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
    | { id: string; status: FormulationStatus; medical_review_id: string | null; regulatory_review_id: string | null }
    | null;
  if (!row) return NextResponse.json({ error: 'Formulation not found' }, { status: 404 });

  if (row.medical_review_id) {
    return NextResponse.json(
      { error: 'Medical review already recorded for this formulation version' },
      { status: 409 },
    );
  }

  // Determine counterpart status (if regulatory already decided, read it).
  let regulatoryDecision: ReviewDecision | null = null;
  if (row.regulatory_review_id) {
    const { data: reg } = await supabase
      .from('custom_formulation_regulatory_reviews')
      .select('decision')
      .eq('id', row.regulatory_review_id)
      .maybeSingle();
    regulatoryDecision = ((reg as { decision: ReviewDecision } | null)?.decision) ?? null;
  }

  const transition = applyReviewDecision(
    {
      formulationStatus: row.status,
      medical: null,
      regulatory: regulatoryDecision,
    },
    'medical',
    body.decision,
  );

  if (transition.kind === 'error') {
    return NextResponse.json({ error: transition.reason }, { status: 409 });
  }

  const { data: reviewInsert, error: reviewErr } = await supabase
    .from('custom_formulation_medical_reviews')
    .insert({
      custom_formulation_id: params.id,
      reviewer_user_id: auth.userId,
      decision: body.decision,
      decision_notes: body.decision_notes.trim(),
      clinical_appropriateness_assessment: body.clinical_appropriateness_assessment ?? null,
      dose_appropriateness_assessment: body.dose_appropriateness_assessment ?? null,
      interaction_concerns: body.interaction_concerns ?? null,
      intended_use_concerns: body.intended_use_concerns ?? null,
      revision_items: (body.revision_items ?? []) as never,
    } as never)
    .select('id')
    .single();
  if (reviewErr || !reviewInsert) {
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

  await supabase.from('custom_formulations').update(updates as never).eq('id', params.id);

  return NextResponse.json({
    ok: true,
    review_id: (reviewInsert as { id: string }).id,
    new_status: transition.kind === 'advance' ? transition.next : row.status,
    transition: transition.reason,
  });
}
