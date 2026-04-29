// Prompt #104 Phase 2: Counterparty merge.
//
// POST /api/admin/legal/counterparties/[counterpartyId]/merge
//   { merged_counterparty_id, merge_reason }
//   -> merges merged_counterparty_id INTO counterpartyId. The merged
//      record's row is preserved as audit history (no FK deletion);
//      its case associations are reassigned to the surviving record;
//      a row is written to legal_counterparty_merge_history capturing
//      the operation for later unmerge.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.counterparties.merge.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { counterpartyId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const mergedId: string | null = typeof body.merged_counterparty_id === 'string' ? body.merged_counterparty_id : null;
    const reason: string | null = typeof body.merge_reason === 'string' && body.merge_reason.length >= 10 ? body.merge_reason : null;
    if (!mergedId) return NextResponse.json({ error: 'merged_counterparty_id required' }, { status: 400 });
    if (!reason) return NextResponse.json({ error: 'merge_reason required (>= 10 chars)' }, { status: 400 });
    if (mergedId === params.counterpartyId) {
      return NextResponse.json({ error: 'Cannot merge a counterparty into itself' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: surviving } = await sb.from('legal_counterparties')
      .select('counterparty_id, display_label, marketplace_handles, jurisdictions, total_cases_count, total_settlement_cents')
      .eq('counterparty_id', params.counterpartyId)
      .maybeSingle();
    if (!surviving) return NextResponse.json({ error: 'Surviving counterparty not found' }, { status: 404 });

    const { data: merged } = await sb.from('legal_counterparties')
      .select('counterparty_id, display_label, marketplace_handles, jurisdictions, total_cases_count, total_settlement_cents, verified_business_reg_id, verified_domain')
      .eq('counterparty_id', mergedId)
      .maybeSingle();
    if (!merged) return NextResponse.json({ error: 'Merged counterparty not found' }, { status: 404 });

    // Reassign case rows.
    const { error: updErr } = await sb
      .from('legal_investigation_cases')
      .update({ counterparty_id: params.counterpartyId, updated_at: new Date().toISOString() })
      .eq('counterparty_id', mergedId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Merge handles + jurisdictions onto the surviving record.
    const survivingHandles: Array<Record<string, unknown>> = Array.isArray(surviving.marketplace_handles) ? surviving.marketplace_handles : [];
    const mergedHandles: Array<Record<string, unknown>> = Array.isArray(merged.marketplace_handles) ? merged.marketplace_handles : [];
    const survivingJur: string[] = Array.isArray(surviving.jurisdictions) ? surviving.jurisdictions : [];
    const mergedJur: string[] = Array.isArray(merged.jurisdictions) ? merged.jurisdictions : [];

    const handleKey = (h: Record<string, unknown>): string => `${(h.platform as string ?? '').toLowerCase()}:${(h.handle as string ?? '').toLowerCase()}`;
    const handles = [...survivingHandles];
    const seen = new Set(survivingHandles.map(handleKey));
    for (const h of mergedHandles) {
      const k = handleKey(h);
      if (!seen.has(k)) { handles.push(h); seen.add(k); }
    }
    const jurisdictions = Array.from(new Set([...survivingJur, ...mergedJur]));

    await sb.from('legal_counterparties').update({
      marketplace_handles: handles,
      jurisdictions,
      total_cases_count: (surviving.total_cases_count ?? 0) + (merged.total_cases_count ?? 0),
      total_settlement_cents: (surviving.total_settlement_cents ?? 0) + (merged.total_settlement_cents ?? 0),
      last_activity_at: new Date().toISOString(),
    }).eq('counterparty_id', params.counterpartyId);

    // Mark the merged record disputed=false, but otherwise preserve as
    // audit trail. Append a notes line indicating the merge.
    await sb.from('legal_counterparties').update({
      notes: `Merged into ${params.counterpartyId} on ${new Date().toISOString()}. Reason: ${reason}`,
      last_activity_at: new Date().toISOString(),
    }).eq('counterparty_id', mergedId);

    const mergedIdentifiers = {
      verified_business_reg_id: merged.verified_business_reg_id ?? null,
      verified_domain: merged.verified_domain ?? null,
      marketplace_handles: mergedHandles,
    };
    const { error: histErr } = await sb.from('legal_counterparty_merge_history').insert({
      surviving_counterparty_id: params.counterpartyId,
      merged_counterparty_id: mergedId,
      merge_reason: reason,
      merged_identifiers_json: mergedIdentifiers,
      merged_by: ctx.user_id,
    });
    if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'counterparty',
      action_verb: 'merged',
      target_table: 'legal_counterparties',
      target_id: params.counterpartyId,
      after_state_json: { merged_in: mergedId, reason, merged_identifiers: mergedIdentifiers },
    });

    return NextResponse.json({ ok: true, surviving: params.counterpartyId, merged_in: mergedId });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.counterparties.merge', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.counterparties.merge', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
