// Prompt #127 P4: HIPAA contingency plan test record.
// 45 CFR 164.308(a)(7)(ii)(D), Addressable (Testing and Revision).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_KINDS = new Set(['data_backup_test', 'disaster_recovery_test', 'emergency_mode_test', 'full_tabletop_exercise', 'live_drill']);

interface Body {
  testDate?: string;
  testKind?: string;
  scope?: string;
  outcomeSummary?: string;
  correctiveActions?: unknown[];
  storageKey?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.hipaa.contingency.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.hipaa.contingency.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!HIPAA_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'HIPAA admin role required' }, { status: 403 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const testDate = (body.testDate ?? '').trim();
  const testKind = (body.testKind ?? '').trim();
  const scope = (body.scope ?? '').trim();
  const outcomeSummary = (body.outcomeSummary ?? '').trim();
  if (!testDate) return NextResponse.json({ error: 'test_date_required' }, { status: 400 });
  if (!VALID_KINDS.has(testKind)) return NextResponse.json({ error: 'invalid_test_kind' }, { status: 400 });
  if (!scope || scope.length < 10) return NextResponse.json({ error: 'scope_required', minLength: 10 }, { status: 400 });
  if (!outcomeSummary || outcomeSummary.length < 20) return NextResponse.json({ error: 'outcome_summary_required', minLength: 20 }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('hipaa_contingency_plan_tests')
      .insert({
        test_date: testDate,
        test_kind: testKind,
        scope,
        outcome_summary: outcomeSummary,
        storage_key: body.storageKey ?? null,
        corrective_actions: Array.isArray(body.correctiveActions) ? body.correctiveActions : null,
        recorded_by: user.id,
      })
      .select('id')
      .single())(),
    8000,
    'api.hipaa.contingency.insert',
  );
  if (error) {
    safeLog.error('api.hipaa.contingency', 'insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hipaa.contingency', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.hipaa.contingency', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
