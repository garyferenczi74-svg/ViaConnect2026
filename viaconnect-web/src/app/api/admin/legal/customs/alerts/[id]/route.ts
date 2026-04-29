// Prompt #114 P4a: IPRS alert review.
//
// PATCH /api/admin/legal/customs/alerts/[id]
//   { status?, review_notes? }
//   -> allow-list is tight. reviewed_by/reviewed_at are server-derived from
//      auth.uid() and NOW(); body-provided values are stripped (P2b-equivalent
//      guard against impersonation).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import type { CustomsIprsResultStatus } from '@/lib/customs/types';
import { CUSTOMS_IPRS_RESULT_STATUSES } from '@/lib/customs/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

const ALERT_PATCHABLE_KEYS = ['status', 'review_notes'] as const;

interface ProfileLite {
  role: string;
}

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.alerts.detail.auth');
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
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};

    // Reject body-provided reviewer attribution fields. Server derives.
    if ('reviewed_by' in body || 'reviewed_at' in body) {
      return NextResponse.json(
        { error: 'reviewed_by / reviewed_at are server-derived and cannot be set via body' },
        { status: 400 },
      );
    }

    if (
      body.status !== undefined &&
      !CUSTOMS_IPRS_RESULT_STATUSES.includes(body.status as CustomsIprsResultStatus)
    ) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    const { data: existing } = await sb
      .from('customs_iprs_scan_results')
      .select('scan_result_id, status, review_notes, reviewed_at, reviewed_by, case_id')
      .eq('scan_result_id', params.id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      reviewed_by: ctx.user_id,
      reviewed_at: new Date().toISOString(),
    };
    for (const k of ALERT_PATCHABLE_KEYS) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    const { data: updated, error } = await sb
      .from('customs_iprs_scan_results')
      .update(update)
      .eq('scan_result_id', params.id)
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
      action_category: 'customs_iprs',
      action_verb: 'alert_reviewed',
      target_table: 'customs_iprs_scan_results',
      target_id: params.id,
      case_id: existing.case_id ?? null,
      before_state_json: {
        status: existing.status,
        review_notes: existing.review_notes,
        reviewed_at: existing.reviewed_at,
      },
      after_state_json: {
        status: updated.status,
        review_notes: updated.review_notes,
        reviewed_at: updated.reviewed_at,
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.alerts.detail', 'PATCH timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.alerts.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
