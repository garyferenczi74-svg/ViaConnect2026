// Prompt #95 Phase 7: governance audit CSV export.
// GET /api/admin/governance/audit/export?since=...&until=...&domain=...&event_type=...
// Joins pricing_proposals + price_change_history + proposal_approvals +
// governance_configuration_log into one event stream and emits RFC 4180 CSV.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import {
  serializeGovernanceAuditCsv,
  type AuditEventRow,
} from '@/lib/governance/audit-csv';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireGovernanceAdmin();
    if (auth.kind === 'error') return auth.response;

  const { searchParams } = request.nextUrl;
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const domain = searchParams.get('domain');
  const eventType = searchParams.get('event_type');

  const supabase = createClient();
  const events: AuditEventRow[] = [];

  // Proposal lifecycle events (initiated / submitted / activated / rolled_back / withdrawn / expired)
  let proposals = supabase
    .from('pricing_proposals')
    .select(
      'id, proposal_number, title, pricing_domain_id, status, initiated_at, submitted_at, activated_at, rolled_back_at, expired_at, initiated_by, rolled_back_by',
    )
    .order('initiated_at', { ascending: false })
    .limit(5000);
  if (since) proposals = proposals.gte('initiated_at', since);
  if (until) proposals = proposals.lte('initiated_at', until);
  if (domain) proposals = proposals.eq('pricing_domain_id', domain);

  const { data: proposalRows } = await proposals;
  for (const p of (proposalRows ?? []) as Array<Record<string, unknown>>) {
    const push = (ts: string, type: string, summary: string) => {
      if (eventType && eventType !== type) return;
      events.push({
        event_type: type,
        event_time: ts,
        actor_user_id: (p.initiated_by as string) ?? null,
        actor_email: null,
        proposal_id: p.id as string,
        proposal_number: p.proposal_number as number,
        proposal_title: p.title as string,
        pricing_domain_id: p.pricing_domain_id as string,
        summary,
        raw: { status: p.status },
      });
    };
    // Note: `proposal_activated` and `proposal_rolled_back` are NOT pushed
    // here. They come from price_change_history as `price_activation` /
    // `price_rollback`, which is the canonical source for those events.
    // Emitting them from both tables would double-count in the audit
    // timeline.
    if (p.initiated_at) push(p.initiated_at as string, 'proposal_initiated', 'Draft created');
    if (p.submitted_at) push(p.submitted_at as string, 'proposal_submitted', 'Submitted for approval');
    if (p.expired_at) push(p.expired_at as string, 'proposal_expired', 'Auto expired');
  }

  // Individual approval decisions.
  const approvalsQuery = supabase
    .from('proposal_approvals')
    .select(
      'id, proposal_id, approver_user_id, approver_role, decision, decided_at, advisory_comment, advisory_commented_at, pricing_proposals!inner(proposal_number, title, pricing_domain_id)',
    )
    .order('decided_at', { ascending: false })
    .limit(5000);

  const { data: approvalRows } = await approvalsQuery;
  for (const a of (approvalRows ?? []) as Array<Record<string, unknown>>) {
    if (a.decided_at) {
      const type = `approval_${a.decision as string}`;
      if (eventType && eventType !== type) continue;
      const p = (a.pricing_proposals ?? {}) as {
        proposal_number?: number;
        title?: string;
        pricing_domain_id?: string;
      };
      if (domain && p.pricing_domain_id !== domain) continue;
      events.push({
        event_type: type,
        event_time: a.decided_at as string,
        actor_user_id: (a.approver_user_id as string) ?? null,
        actor_email: null,
        proposal_id: a.proposal_id as string,
        proposal_number: p.proposal_number ?? null,
        proposal_title: p.title ?? null,
        pricing_domain_id: p.pricing_domain_id ?? null,
        summary: `${a.approver_role}: ${a.decision}`,
        raw: { approver_role: a.approver_role },
      });
    }
  }

  // Price change history (activations + rollbacks).
  let history = supabase
    .from('price_change_history')
    .select(
      'id, proposal_id, pricing_domain_id, change_action, applied_at, applied_by_user_id, previous_value_cents, new_value_cents, previous_value_percent, new_value_percent',
    )
    .order('applied_at', { ascending: false })
    .limit(5000);
  if (since) history = history.gte('applied_at', since);
  if (until) history = history.lte('applied_at', until);
  if (domain) history = history.eq('pricing_domain_id', domain);

  const { data: historyRows } = await history;
  for (const h of (historyRows ?? []) as Array<Record<string, unknown>>) {
    const type = `price_${h.change_action as string}`;
    if (eventType && eventType !== type) continue;
    events.push({
      event_type: type,
      event_time: h.applied_at as string,
      actor_user_id: (h.applied_by_user_id as string) ?? null,
      actor_email: null,
      proposal_id: h.proposal_id as string,
      proposal_number: null,
      proposal_title: null,
      pricing_domain_id: h.pricing_domain_id as string,
      summary: `${h.change_action}: ${h.previous_value_cents ?? h.previous_value_percent} -> ${h.new_value_cents ?? h.new_value_percent}`,
      raw: h,
    });
  }

  // Configuration changes.
  const cfg = supabase
    .from('governance_configuration_log')
    .select('id, change_type, target_table, target_id, changed_by, changed_at, change_justification')
    .order('changed_at', { ascending: false })
    .limit(5000);
  const { data: cfgRows } = await cfg;
  for (const c of (cfgRows ?? []) as Array<Record<string, unknown>>) {
    if (eventType && eventType !== c.change_type) continue;
    events.push({
      event_type: c.change_type as string,
      event_time: c.changed_at as string,
      actor_user_id: (c.changed_by as string) ?? null,
      actor_email: null,
      proposal_id: null,
      proposal_number: null,
      proposal_title: null,
      pricing_domain_id: null,
      summary: c.change_justification as string,
      raw: { target_table: c.target_table, target_id: c.target_id },
    });
  }

    events.sort((a, b) => (a.event_time < b.event_time ? 1 : -1));

    const csv = serializeGovernanceAuditCsv(events);
    const filename = `governance-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.governance.audit-export', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.governance.audit-export', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
