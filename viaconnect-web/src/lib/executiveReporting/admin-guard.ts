// Prompt #105 Phase 2b — exec-reporting admin guard.
//
// Gates every /api/admin/exec-reporting/* route. Admits:
//   - 'admin' (global)
//   - 'exec_reporting_admin' (scoped Phase 1 role)
//   - 'cfo' (signoff authority)
//   - 'ceo' (issue authority)
//
// Board members do NOT pass this guard; they use /board/* portal routes
// that check their specific membership + NDA eligibility instead.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type ExecAdminRole = 'admin' | 'exec_reporting_admin' | 'cfo' | 'ceo';

export type ExecReportingAdminCheck =
  | { kind: 'ok'; userId: string; role: ExecAdminRole }
  | { kind: 'error'; response: NextResponse };

const ADMIT: ReadonlySet<ExecAdminRole> = new Set(['admin', 'exec_reporting_admin', 'cfo', 'ceo']);

export async function requireExecReportingAdmin(): Promise<ExecReportingAdminCheck> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { kind: 'error', response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role: string | null } | null)?.role ?? null;
  if (!role || !ADMIT.has(role as ExecAdminRole)) {
    return { kind: 'error', response: NextResponse.json({ error: 'Forbidden', role }, { status: 403 }) };
  }
  return { kind: 'ok', userId: user.id, role: role as ExecAdminRole };
}

/** Stricter: only CFO + admin. Used for CFO-approval endpoints. */
export async function requireCFO(): Promise<ExecReportingAdminCheck> {
  const check = await requireExecReportingAdmin();
  if (check.kind === 'error') return check;
  if (check.role !== 'cfo' && check.role !== 'admin') {
    return {
      kind: 'error',
      response: NextResponse.json({ error: 'Forbidden: CFO role required', role: check.role }, { status: 403 }),
    };
  }
  return check;
}

/** Strictest: only CEO. admin cannot substitute. Mirrors isCEO in edge-function shared. */
export async function requireCEO(): Promise<ExecReportingAdminCheck> {
  const check = await requireExecReportingAdmin();
  if (check.kind === 'error') return check;
  if (check.role !== 'ceo') {
    return {
      kind: 'error',
      response: NextResponse.json({
        error: 'Forbidden: CEO role required (admin cannot substitute)',
        role: check.role,
      }, { status: 403 }),
    };
  }
  return check;
}
