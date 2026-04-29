// Prompt #114 P2a GET + P2b PATCH: Recordation detail + state transition.
//
// GET   /api/admin/legal/customs/recordations/[id]
//   -> full recordation row + IC classes + fee ledger count.
// PATCH /api/admin/legal/customs/recordations/[id]
//   { status?, mark_text?, uspto_registration_number?, uspto_registration_date?,
//     uspto_renewal_date?, copyright_registration_date?, cbp_recordation_number?,
//     cbp_recordation_date?, cbp_expiration_date?, cbp_grace_expiration_date?,
//     total_ic_count?, total_fee_cents?, renewal_fee_cents?, submitted_at?,
//     iprr_confirmation_vault_ref?, counsel_reviewed?: true, notes? }
//   -> state transitions gated by recordationStateMachine; CEO approval fields
//      rejected (callers must use POST /ceo-approve for SECURITY DEFINER path).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { canTransition } from '@/lib/customs/recordationStateMachine';
import type { CustomsRecordationStatus } from '@/lib/customs/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const CFO_CEO_ROLES = new Set(['cfo', 'ceo']);

// Patchable by legal-ops. ceo_approved_* are NOT here; CEO approval
// must go through POST /ceo-approve (SECURITY DEFINER, aal2-gated).
const RECORDATION_PATCHABLE_KEYS = [
  'status',
  'mark_text',
  'uspto_registration_number',
  'uspto_registration_date',
  'uspto_renewal_date',
  'copyright_registration_date',
  'cbp_recordation_number',
  'cbp_recordation_date',
  'cbp_expiration_date',
  'cbp_grace_expiration_date',
  'total_ic_count',
  'total_fee_cents',
  'renewal_fee_cents',
  'submitted_at',
  'iprr_confirmation_vault_ref',
  'mark_image_vault_ref',
  'notes',
] as const;

interface ProfileLite {
  role: string;
}

async function requireLegalOrExec(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.recordations.detail.auth');
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: ProfileLite | null }>;
        };
      };
    };
  };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  const isLegalOps = LEGAL_OPS_ROLES.has(profile.role);
  const isExec = CFO_CEO_ROLES.has(profile.role);
  if (!isLegalOps && !isExec) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role, is_legal_ops: isLegalOps };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: recordation, error } = await sb
      .from('customs_recordations')
      .select('*')
      .eq('recordation_id', params.id)
      .maybeSingle();
    if (error || !recordation) {
      return NextResponse.json({ error: 'Recordation not found' }, { status: 404 });
    }

    const { data: classes } = await sb
      .from('customs_recordation_classes')
      .select('*')
      .eq('recordation_id', params.id)
      .order('international_class', { ascending: true });

    const { count: feeLedgerCount } = await sb
      .from('customs_fee_ledger')
      .select('fee_entry_id', { count: 'exact', head: true })
      .eq('recordation_id', params.id);

    return NextResponse.json({
      recordation,
      classes: classes ?? [],
      fee_ledger_count: feeLedgerCount ?? 0,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.recordations.detail', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.recordations.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;
    if (!ctx.is_legal_ops) {
      return NextResponse.json(
        { error: 'Only legal-ops roles can edit recordations' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) ?? {};

    // Reject body-provided CEO approval fields. Callers must use the
    // SECURITY DEFINER RPC approve_customs_recordation_ceo so the approver
    // identity is derived from auth.uid() and impersonation is impossible.
    if ('ceo_approved_by' in body || 'ceo_approved_at' in body) {
      return NextResponse.json(
        { error: 'ceo_approved_by / ceo_approved_at cannot be set via PATCH; use /ceo-approve endpoint' },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: existing, error: loadError } = await sb
      .from('customs_recordations')
      .select('*')
      .eq('recordation_id', params.id)
      .maybeSingle();
    if (loadError || !existing) {
      return NextResponse.json({ error: 'Recordation not found' }, { status: 404 });
    }

    // Defense in depth: validate status transition in TS BEFORE the DB
    // trigger fires, so we surface a clean 409 instead of a generic 500.
    if (typeof body.status === 'string' && body.status !== existing.status) {
      const r = canTransition({
        from: existing.status as CustomsRecordationStatus,
        to: body.status as CustomsRecordationStatus,
      });
      if (!r.ok) {
        return NextResponse.json(
          {
            error: `Invalid recordation status transition ${existing.status} -> ${body.status}`,
            reason: r.reason,
          },
          { status: 409 },
        );
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of RECORDATION_PATCHABLE_KEYS) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    // Convenience flag: caller sets `counsel_reviewed: true` and we
    // populate both counsel_reviewed_by (from auth.uid) + counsel_reviewed_at (now).
    if (body.counsel_reviewed === true) {
      update.counsel_reviewed_by = ctx.user_id;
      update.counsel_reviewed_at = new Date().toISOString();
    }

    const { data: updated, error } = await sb
      .from('customs_recordations')
      .update(update)
      .eq('recordation_id', params.id)
      .select('*')
      .maybeSingle();
    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 },
      );
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'customs_recordation',
      action_verb: 'updated',
      target_table: 'customs_recordations',
      target_id: params.id,
      before_state_json: {
        status: existing.status,
        counsel_reviewed_at: existing.counsel_reviewed_at,
        submitted_at: existing.submitted_at,
        cbp_recordation_number: existing.cbp_recordation_number,
        total_fee_cents: existing.total_fee_cents,
      },
      after_state_json: {
        status: updated.status,
        counsel_reviewed_at: updated.counsel_reviewed_at,
        submitted_at: updated.submitted_at,
        cbp_recordation_number: updated.cbp_recordation_number,
        total_fee_cents: updated.total_fee_cents,
        changed_keys: Object.keys(update),
      },
    });

    return NextResponse.json({ recordation: updated });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.recordations.detail', 'PATCH timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.recordations.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
