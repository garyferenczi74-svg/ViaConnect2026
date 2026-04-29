// Prompt #114 P4a: Open-as-case for an IPRS alert.
//
// POST /api/admin/legal/customs/alerts/[id]/open-as-case
//   { priority?, notes? }
//   -> creates a legal_investigation_cases row (bucket='counterfeit',
//      state='intake'), atomically links the scan result (case_id + status
//      transition to 'case_opened'), writes audit. Compensating delete on
//      link failure to prevent orphaned cases.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { nextCaseLabel } from '@/lib/legal/caseLabel';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite {
  role: string;
}

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.alerts.open-as-case.auth');
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const priority: string = typeof body.priority === 'string' ? body.priority : 'p3_normal';
    const notes: string | null = typeof body.notes === 'string' ? body.notes : null;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    const { data: alert } = await sb
      .from('customs_iprs_scan_results')
      .select('*')
      .eq('scan_result_id', params.id)
      .maybeSingle();
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    if (alert.case_id) {
      return NextResponse.json(
        { error: 'Alert already linked to case ' + alert.case_id },
        { status: 409 },
      );
    }

    const year = new Date().getUTCFullYear();
    const { data: existingLabels } = await sb
      .from('legal_investigation_cases')
      .select('case_label')
      .like('case_label', `LEG-${year}-%`);
    const labels = ((existingLabels ?? []) as Array<{ case_label: string }>).map((r) => r.case_label);
    const newLabel = nextCaseLabel({ year, existing_labels_for_year: labels });

    const { data: createdCase, error: caseError } = await sb
      .from('legal_investigation_cases')
      .insert({
        case_label: newLabel,
        bucket: 'counterfeit',
        priority,
        notes: notes ?? `Opened from IPRS alert ${params.id}`,
        metadata_json: {
          origin: 'customs_iprs_alert',
          scan_result_id: params.id,
          listing_url: alert.listing_url,
        },
      })
      .select('case_id, case_label, state, bucket')
      .maybeSingle();
    if (caseError || !createdCase) {
      return NextResponse.json(
        { error: caseError?.message ?? 'Case insert failed' },
        { status: 500 },
      );
    }

    // Atomically link the alert to the new case. If this fails we
    // compensate by deleting the freshly created case so no orphans.
    const { error: linkError } = await sb
      .from('customs_iprs_scan_results')
      .update({
        case_id: createdCase.case_id,
        status: 'case_opened',
        reviewed_by: ctx.user_id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('scan_result_id', params.id);
    if (linkError) {
      await sb
        .from('legal_investigation_cases')
        .delete()
        .eq('case_id', createdCase.case_id);
      return NextResponse.json(
        { error: 'Link failed, case rolled back: ' + linkError.message },
        { status: 500 },
      );
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'customs_iprs',
      action_verb: 'case_opened_from_alert',
      target_table: 'customs_iprs_scan_results',
      target_id: params.id,
      case_id: createdCase.case_id,
      after_state_json: {
        case_label: createdCase.case_label,
        bucket: createdCase.bucket,
        priority,
      },
    });

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'case',
      action_verb: 'opened',
      target_table: 'legal_investigation_cases',
      target_id: createdCase.case_id,
      case_id: createdCase.case_id,
      after_state_json: {
        case_label: createdCase.case_label,
        bucket: createdCase.bucket,
        state: createdCase.state,
        priority,
        origin: 'customs_iprs_alert',
        scan_result_id: params.id,
      },
    });

    return NextResponse.json(
      { case: createdCase, alert_id: params.id },
      { status: 201 },
    );
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.alerts.open-as-case', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.alerts.open-as-case', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
