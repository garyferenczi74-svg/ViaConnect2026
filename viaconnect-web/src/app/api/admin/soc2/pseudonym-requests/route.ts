// Prompt #122 P9: Pseudonym-request list for the admin approval queue.
// Returns all action='pseudonym_resolve_request' rows with current
// approval state. Compliance / admin / superadmin only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { classifyFromRows, type LogRow } from '@/lib/soc2/auditor/pseudonymApprovals';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin', 'legal_counsel']);

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.pseudonym-requests.list.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.soc2.pseudonym-requests.list.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance or legal role required' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const dataRes = await withTimeout(
      (async () => sb
        .from('soc2_auditor_access_log')
        .select('id, grant_id, packet_id, action, target_path, resolved_pseudonym, justification, approver_steve, approver_thomas, occurred_at')
        .in('action', ['pseudonym_resolve_request', 'pseudonym_resolve_granted', 'pseudonym_resolve_denied'])
        .order('occurred_at', { ascending: false })
        .limit(1000))(),
      10000,
      'api.soc2.pseudonym-requests.list',
    );
    const rows: LogRow[] = (dataRes.data as LogRow[] | null) ?? [];

    const requests = rows.filter((r) => r.action === 'pseudonym_resolve_request');
    const byKey = new Map<string, LogRow[]>();
    for (const r of rows) {
      const key = `${r.packet_id ?? ''}|${r.resolved_pseudonym ?? ''}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r);
    }

    const out = requests.map((req) => {
      const key = `${req.packet_id ?? ''}|${req.resolved_pseudonym ?? ''}`;
      const snapshot = classifyFromRows(req, byKey.get(key) ?? []);
      return {
        requestLogId: req.id,
        grantId: req.grant_id,
        packetId: req.packet_id,
        pseudonym: req.resolved_pseudonym,
        justification: req.justification,
        requestedAt: req.occurred_at,
        state: snapshot.state,
        steveApprovedBy: snapshot.steveApprovalRow?.approver_steve ?? null,
        steveApprovedAt: snapshot.steveApprovalRow?.occurred_at ?? null,
        thomasApprovedBy: snapshot.thomasApprovalRow?.approver_thomas ?? null,
        thomasApprovedAt: snapshot.thomasApprovalRow?.occurred_at ?? null,
        resolvedRealId: snapshot.resolutionRow?.target_path ?? null,
        deniedAt: snapshot.denialRow?.occurred_at ?? null,
      };
    });

    return NextResponse.json({ ok: true, requests: out, viewerRole: role });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.pseudonym-requests.list', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.pseudonym-requests.list', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
