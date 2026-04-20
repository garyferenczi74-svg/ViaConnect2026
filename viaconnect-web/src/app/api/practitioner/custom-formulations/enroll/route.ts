// Prompt #97 Phase 2.2: practitioner Level 4 enrollment.
// POST /api/practitioner/custom-formulations/enroll
// Body: { acknowledged_exclusive_use_agreement: true, typed_signature: string }
// Verifies eligibility, requires signed exclusive-use agreement, creates
// the level_4_enrollments row. Idempotent: if an enrollment already
// exists returns its id.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { checkLevel4Eligibility } from '@/lib/custom-formulations/eligibility';

export async function POST(request: NextRequest) {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { acknowledged_exclusive_use_agreement?: boolean; typed_signature?: string }
    | null;

  if (!body?.acknowledged_exclusive_use_agreement) {
    return NextResponse.json(
      { error: 'Exclusive-use agreement acknowledgment is required' },
      { status: 400 },
    );
  }
  if (!body.typed_signature || body.typed_signature.trim().length < 3) {
    return NextResponse.json(
      { error: 'Typed signature of at least 3 characters is required' },
      { status: 400 },
    );
  }

  const eligibility = await checkLevel4Eligibility(auth.practitionerId);
  if (eligibility.dependencyPending) {
    return NextResponse.json(
      {
        error: 'Level 4 enrollment is pending dependency prompt application',
        dependency_pending: true,
        reasons: eligibility.reasons,
      },
      { status: 409 },
    );
  }
  if (!eligibility.isEligible) {
    return NextResponse.json(
      {
        error: 'Not eligible for Level 4 enrollment',
        reasons: eligibility.reasons,
        evidence: eligibility.evidence,
      },
      { status: 403 },
    );
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('level_4_enrollments')
    .select('id, status')
    .eq('practitioner_id', auth.practitionerId)
    .maybeSingle();

  const row = existing as { id: string; status: string } | null;
  if (row) {
    return NextResponse.json({ ok: true, id: row.id, status: row.status, already_enrolled: true });
  }

  const { data: insertResult, error } = await supabase
    .from('level_4_enrollments')
    .insert({
      practitioner_id: auth.practitionerId,
      status: 'eligibility_verified',
      level_3_enrollment_id: null,
      level_3_delivered_order_id: eligibility.evidence.deliveredOrder?.id ?? null,
      master_practitioner_cert_id: eligibility.evidence.certification?.id ?? null,
      master_practitioner_verified_at: eligibility.evidence.certification
        ? new Date().toISOString()
        : null,
      level_3_delivered_verified_at: eligibility.evidence.deliveredOrder
        ? new Date().toISOString()
        : null,
      exclusive_use_agreement_signed: true,
      exclusive_use_agreement_signed_at: new Date().toISOString(),
      metadata: { typed_signature: body.typed_signature.trim() },
    } as never)
    .select('id, status')
    .single();

  if (error || !insertResult) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json(insertResult);
}
