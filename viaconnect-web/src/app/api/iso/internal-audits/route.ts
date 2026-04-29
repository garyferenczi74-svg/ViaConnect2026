// Prompt #127 P6: ISO 27001 internal audit write route. Clause 9.2.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

interface Body {
  auditRef?: string;
  auditDate?: string;
  scope?: string;
  auditor?: string;
  auditorIsIndependent?: boolean;
  majorFindingsCount?: number;
  minorFindingsCount?: number;
  observationsCount?: number;
  summary?: string;
  storageKey?: string | null;
}

function isNonNegInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.iso.internal-audits.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.iso.internal-audits.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!ISO_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'ISO admin role required' }, { status: 403 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const auditRef = (body.auditRef ?? '').trim();
  const auditDate = (body.auditDate ?? '').trim();
  const scope = (body.scope ?? '').trim();
  const auditor = (body.auditor ?? '').trim();
  const summary = (body.summary ?? '').trim();
  const major = body.majorFindingsCount ?? 0;
  const minor = body.minorFindingsCount ?? 0;
  const obs = body.observationsCount ?? 0;

  if (!auditRef) return NextResponse.json({ error: 'audit_ref_required' }, { status: 400 });
  if (!auditDate) return NextResponse.json({ error: 'audit_date_required' }, { status: 400 });
  if (scope.length < 10) return NextResponse.json({ error: 'scope_too_short', minLength: 10 }, { status: 400 });
  if (!auditor) return NextResponse.json({ error: 'auditor_required' }, { status: 400 });
  if (summary.length < 20) return NextResponse.json({ error: 'summary_too_short', minLength: 20 }, { status: 400 });
  if (!isNonNegInt(major) || !isNonNegInt(minor) || !isNonNegInt(obs)) {
    return NextResponse.json({ error: 'invalid_findings_count' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('iso_internal_audits')
      .insert({
        audit_ref: auditRef,
        audit_date: auditDate,
        scope,
        auditor,
        auditor_is_independent: body.auditorIsIndependent !== false,
        major_findings_count: major,
        minor_findings_count: minor,
        observations_count: obs,
        summary,
        storage_key: body.storageKey ?? null,
        recorded_by: user.id,
      })
      .select('id')
      .single())(),
    8000,
    'api.iso.internal-audits.insert',
  );
  if (error) {
    safeLog.error('api.iso.internal-audits', 'insert failed', { message: error.message });
    if (error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'duplicate_audit_ref' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.iso.internal-audits', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.iso.internal-audits', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
