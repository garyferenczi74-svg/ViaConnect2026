// Prompt #127 P6: ISO 27001 risk register write route.
// Clause 6.1.2, 8.2 Risk Assessment.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_TREATMENT = new Set(['modify', 'retain', 'avoid', 'share']);
const VALID_STATUS = new Set(['open', 'treated', 'accepted', 'closed', 'superseded']);

interface Body {
  riskRef?: string;
  asset?: string | null;
  threat?: string;
  vulnerability?: string;
  description?: string;
  likelihood?: number;
  impact?: number;
  treatmentOption?: string;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  status?: string;
  identifiedAt?: string;
  nextReviewDate?: string | null;
}

function isInt1to5(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.iso.risks.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.iso.risks.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!ISO_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'ISO admin role required' }, { status: 403 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const riskRef = (body.riskRef ?? '').trim();
  const threat = (body.threat ?? '').trim();
  const vulnerability = (body.vulnerability ?? '').trim();
  const description = (body.description ?? '').trim();
  const treatmentOption = (body.treatmentOption ?? '').trim();
  const status = (body.status ?? '').trim();
  const identifiedAt = (body.identifiedAt ?? '').trim();

  if (!riskRef) return NextResponse.json({ error: 'risk_ref_required' }, { status: 400 });
  if (threat.length < 10) return NextResponse.json({ error: 'threat_too_short', minLength: 10 }, { status: 400 });
  if (vulnerability.length < 10) return NextResponse.json({ error: 'vulnerability_too_short', minLength: 10 }, { status: 400 });
  if (description.length < 20) return NextResponse.json({ error: 'description_too_short', minLength: 20 }, { status: 400 });
  if (!isInt1to5(body.likelihood)) return NextResponse.json({ error: 'invalid_likelihood', range: '1-5' }, { status: 400 });
  if (!isInt1to5(body.impact)) return NextResponse.json({ error: 'invalid_impact', range: '1-5' }, { status: 400 });
  if (!VALID_TREATMENT.has(treatmentOption)) return NextResponse.json({ error: 'invalid_treatment_option' }, { status: 400 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  if (!identifiedAt) return NextResponse.json({ error: 'identified_at_required' }, { status: 400 });

  const residualLikelihood = body.residualLikelihood;
  const residualImpact = body.residualImpact;
  if (residualLikelihood !== null && residualLikelihood !== undefined && !isInt1to5(residualLikelihood)) {
    return NextResponse.json({ error: 'invalid_residual_likelihood', range: '1-5' }, { status: 400 });
  }
  if (residualImpact !== null && residualImpact !== undefined && !isInt1to5(residualImpact)) {
    return NextResponse.json({ error: 'invalid_residual_impact', range: '1-5' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('iso_risk_register')
      .insert({
        risk_ref: riskRef,
        asset: body.asset ?? null,
        threat,
        vulnerability,
        description,
        likelihood: body.likelihood,
        impact: body.impact,
        treatment_option: treatmentOption,
        residual_likelihood: residualLikelihood ?? null,
        residual_impact: residualImpact ?? null,
        status,
        identified_at: identifiedAt,
        next_review_date: body.nextReviewDate ?? null,
        recorded_by: user.id,
      })
      .select('id')
      .single())(),
    8000,
    'api.iso.risks.insert',
  );
  if (error) {
    safeLog.error('api.iso.risks', 'insert failed', { message: error.message });
    if (error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'duplicate_risk_ref' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.iso.risks', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.iso.risks', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
