// Prompt #127 P7: Trigger a cross-framework consistency scan.
//
// Runs the 5 registry-level rules, upserts findings into
// framework_registry_flags, auto-resolves stale open flags. Returns the
// tally so the UI can render a success toast.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runConsistencyScan } from '@/lib/compliance/consistency/checker';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const SCAN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.compliance.consistency.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.compliance.consistency.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!SCAN_ROLES.has(role)) return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });

    const admin = createAdminClient();
    try {
      const outcome = await withTimeout(runConsistencyScan(admin), 60000, 'api.compliance.consistency.scan');
      return NextResponse.json({
        ok: true,
        registryVersion: outcome.registryVersion,
        inserted: outcome.inserted,
        reopened: outcome.reopened,
        refreshed: outcome.refreshed,
        autoResolved: outcome.autoResolved,
        totalFlags: outcome.flags.length,
      });
    } catch (innerErr) {
      if (isTimeoutError(innerErr)) {
        safeLog.warn('api.compliance.consistency', 'scan timeout', { error: innerErr });
        return NextResponse.json({ error: 'scan_timeout' }, { status: 504 });
      }
      const message = innerErr instanceof Error ? innerErr.message : 'scan_failed';
      safeLog.error('api.compliance.consistency', 'scan failed', { error: innerErr });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.consistency', 'auth/db timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.consistency', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
