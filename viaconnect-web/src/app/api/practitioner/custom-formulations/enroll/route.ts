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
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
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

    const eligibility = await withTimeout(
      checkLevel4Eligibility(auth.practitionerId),
      10000,
      'api.practitioner.custom-formulations.enroll.eligibility',
    );
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

    const existingRes = await withTimeout(
      (async () => supabase
        .from('level_4_enrollments')
        .select('id, status')
        .eq('practitioner_id', auth.practitionerId)
        .maybeSingle())(),
      8000,
      'api.practitioner.custom-formulations.enroll.existing-load',
    );
    const row = existingRes.data as { id: string; status: string } | null;
    if (row) {
      return NextResponse.json({ ok: true, id: row.id, status: row.status, already_enrolled: true });
    }

    const insertRes = await withTimeout(
      (async () => supabase
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
          metadata: { typed_signature: (body.typed_signature ?? '').trim() },
        } as never)
        .select('id, status')
        .single())(),
      8000,
      'api.practitioner.custom-formulations.enroll.insert',
    );
    const insertResult = insertRes.data;
    const error = insertRes.error;

    if (error || !insertResult) {
      safeLog.error('api.practitioner.custom-formulations.enroll', 'insert failed', { requestId, error });
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json(insertResult);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.custom-formulations.enroll', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.custom-formulations.enroll', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
