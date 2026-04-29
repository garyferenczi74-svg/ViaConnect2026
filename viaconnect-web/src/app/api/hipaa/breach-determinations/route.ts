// Prompt #127 P4: HIPAA breach determination with 4-factor assessment.
// 45 CFR 164.402 Definitions / 164.308(a)(6)(ii) Response and Reporting.
//
// When determination = 'breach_confirmed', fires the legal-notifier hook
// so Steve has a 24-hour clock to escalate to counsel per 45 CFR 164.400
// series.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyLegalOfConfirmedBreach } from '@/lib/hipaa/legalNotifier';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_DETERMINATIONS = new Set(['breach_confirmed', 'low_probability_of_compromise', 'not_applicable']);

interface Body {
  incidentId?: string;
  assessmentDate?: string;
  fourFactors?: {
    nature_and_extent_of_phi?: string;
    unauthorized_person_receiving?: string;
    phi_actually_acquired_or_viewed?: string;
    mitigation_taken?: string;
  };
  determination?: string;
  rationale?: string;
  individualsAffectedCount?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.hipaa.breach.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.hipaa.breach.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!HIPAA_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'HIPAA admin role required' }, { status: 403 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const incidentId = (body.incidentId ?? '').trim();
  const assessmentDate = (body.assessmentDate ?? '').trim();
  const determination = (body.determination ?? '').trim();
  const rationale = (body.rationale ?? '').trim();
  if (!incidentId) return NextResponse.json({ error: 'incident_id_required' }, { status: 400 });
  if (!assessmentDate) return NextResponse.json({ error: 'assessment_date_required' }, { status: 400 });
  if (!VALID_DETERMINATIONS.has(determination)) return NextResponse.json({ error: 'invalid_determination' }, { status: 400 });
  if (rationale.length < 50) return NextResponse.json({ error: 'rationale_too_short', minLength: 50 }, { status: 400 });

  const ff = body.fourFactors ?? {};
  const required4Factors = ['nature_and_extent_of_phi', 'unauthorized_person_receiving', 'phi_actually_acquired_or_viewed', 'mitigation_taken'] as const;
  for (const k of required4Factors) {
    if (!ff[k] || String(ff[k]).trim().length < 20) {
      return NextResponse.json({ error: 'four_factor_incomplete', missing: k, minLength: 20 }, { status: 400 });
    }
  }

  const notificationRequired = determination === 'breach_confirmed';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('hipaa_breach_determinations')
      .insert({
        incident_id: incidentId,
        assessment_date: assessmentDate,
        breach_risk_factors: ff,
        determination,
        rationale,
        assessed_by: user.id,
        notification_required: notificationRequired,
        individuals_affected_count: body.individualsAffectedCount ?? null,
      })
      .select('id')
      .single())(),
    8000,
    'api.hipaa.breach.insert',
  );
  if (error) {
    safeLog.error('api.hipaa.breach', 'insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  const row = data as { id: string };

  // Breach-confirmed legal-notifier hook.
  if (determination === 'breach_confirmed') {
    const adminClient = createAdminClient();
    const hook = await notifyLegalOfConfirmedBreach({
      supabase: adminClient,
      breachDeterminationId: row.id,
      incidentId,
      individualsAffectedCount: body.individualsAffectedCount ?? null,
      assessedBy: user.id,
      rationaleSummary: rationale,
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      determination,
      legalNotificationFired: hook.ok,
      nextSteps: hook.ok
        ? 'Legal counsel notification logged. Escalate to Thomas Rosengren within 24 hours.'
        : 'Legal notification delivery FAILED, escalate manually immediately.',
    });
  }

  return NextResponse.json({ ok: true, id: row.id, determination });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hipaa.breach', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.hipaa.breach', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
