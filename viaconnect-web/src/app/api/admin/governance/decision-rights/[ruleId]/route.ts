// Prompt #95 Phase 2: update a decision rights rule.
//
// POST /api/admin/governance/decision-rights/[ruleId]
// Body: { patch: Partial<DecisionRightsRuleRow>, justification: string }
// Loads the current state, applies the patch, writes a governance_config_log
// row. Justification is required (>=10 chars).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { buildConfigLogRow, diffStates } from '@/lib/governance/config-log';

const ALLOWED_FIELDS = new Set([
  'min_percent_change',
  'max_percent_change',
  'min_affected_customers',
  'max_affected_customers',
  'applies_to_categories',
  'required_approvers',
  'advisory_approvers',
  'requires_board_notification',
  'requires_board_approval',
  'target_decision_sla_hours',
  'is_active',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { ruleId: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { patch?: Record<string, unknown>; justification?: string }
    | null;

  if (!body?.patch || !body.justification) {
    return NextResponse.json(
      { error: 'patch and justification are required' },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.patch)) {
    if (ALLOWED_FIELDS.has(k)) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: prev } = await supabase
    .from('decision_rights_rules')
    .select('*')
    .eq('id', params.ruleId)
    .maybeSingle();
  if (!prev) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from('decision_rights_rules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', params.ruleId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const diff = diffStates(prev as Record<string, unknown>, {
    ...(prev as Record<string, unknown>),
    ...patch,
  });

  const logRow = buildConfigLogRow({
    changeType: 'decision_rights_rule_updated',
    targetTable: 'decision_rights_rules',
    targetId: params.ruleId,
    previousState: diff.previous,
    newState: diff.next,
    changedBy: auth.userId,
    justification: body.justification,
  });

  await supabase.from('governance_configuration_log').insert(logRow as never);

  return NextResponse.json({ ok: true, fields_changed: Object.keys(diff.next).length });
}
