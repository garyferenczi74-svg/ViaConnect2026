// Prompt #95 Phase 2: approver assignment + unassignment.
//
// POST /api/admin/governance/approvers
// Body: {
//   action: 'assign' | 'unassign',
//   approver_role?: string  (required for assign),
//   user_id?: string        (required for assign),
//   assignment_id?: string  (required for unassign),
//   justification: string
// }
// Writes a governance_configuration_log row for each change.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { buildConfigLogRow } from '@/lib/governance/config-log';

const VALID_ROLES = new Set(['ceo', 'cfo', 'advisory_cto', 'advisory_medical', 'board_member']);

export async function POST(request: NextRequest) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        action?: 'assign' | 'unassign';
        approver_role?: string;
        user_id?: string;
        assignment_id?: string;
        justification?: string;
      }
    | null;

  if (!body?.action || !body.justification) {
    return NextResponse.json({ error: 'action and justification required' }, { status: 400 });
  }

  const supabase = createClient();

  if (body.action === 'assign') {
    if (!body.approver_role || !body.user_id) {
      return NextResponse.json(
        { error: 'approver_role and user_id required for assign' },
        { status: 400 },
      );
    }
    if (!VALID_ROLES.has(body.approver_role)) {
      return NextResponse.json({ error: 'Invalid approver_role' }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from('approver_assignments')
      .insert({
        approver_role: body.approver_role,
        user_id: body.user_id,
        assigned_by: auth.userId,
      })
      .select('id')
      .single();
    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }

    const row = inserted as { id: string };
    await supabase.from('governance_configuration_log').insert(
      buildConfigLogRow({
        changeType: 'approver_assigned',
        targetTable: 'approver_assignments',
        targetId: row.id,
        previousState: null,
        newState: {
          approver_role: body.approver_role,
          user_id: body.user_id,
        },
        changedBy: auth.userId,
        justification: body.justification,
      }) as never,
    );

    return NextResponse.json({ ok: true, assignment_id: row.id });
  }

  if (body.action === 'unassign') {
    if (!body.assignment_id) {
      return NextResponse.json({ error: 'assignment_id required for unassign' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('approver_assignments')
      .select('id, approver_role, user_id, unassigned_at')
      .eq('id', body.assignment_id)
      .maybeSingle();
    const row = existing as
      | { id: string; approver_role: string; user_id: string; unassigned_at: string | null }
      | null;
    if (!row) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    if (row.unassigned_at) {
      return NextResponse.json({ error: 'Already unassigned' }, { status: 409 });
    }

    const { error } = await supabase
      .from('approver_assignments')
      .update({
        unassigned_at: new Date().toISOString(),
        unassigned_by: auth.userId,
      })
      .eq('id', body.assignment_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('governance_configuration_log').insert(
      buildConfigLogRow({
        changeType: 'approver_unassigned',
        targetTable: 'approver_assignments',
        targetId: row.id,
        previousState: {
          approver_role: row.approver_role,
          user_id: row.user_id,
          unassigned_at: null,
        },
        newState: {
          unassigned_at: new Date().toISOString(),
        },
        changedBy: auth.userId,
        justification: body.justification,
      }) as never,
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
