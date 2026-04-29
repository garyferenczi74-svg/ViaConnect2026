// Prompt #98 Phase 7: Admin reporting aggregator for the referral
// program. Five sections, each downloadable as CSV.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/white-label/csv-export';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

type Section = 'program' | 'per_referrer' | 'milestones' | 'financial' | 'tax';

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'api.admin.practitioner-referrals.reporting.auth',
  );
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const { data: profile } = await withTimeout(
    (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
    8000,
    'api.admin.practitioner-referrals.reporting.profile',
  );
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const auth = await requireAdmin(supabase);
    if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const section = (url.searchParams.get('section') ?? 'program') as Section;
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';

  const sb = supabase as any;
  let rows: Array<Record<string, unknown>> = [];

  if (section === 'program') {
    const [codes, attributions, events, flagsPending, balances] = await Promise.all([
      sb.from('practitioner_referral_codes').select('id, is_active'),
      sb.from('practitioner_referral_attributions').select('id, status'),
      sb.from('practitioner_referral_milestone_events').select('id, vesting_status'),
      sb.from('practitioner_referral_fraud_flags').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      sb.from('practitioner_referral_credit_balances').select('current_balance_cents, lifetime_earned_cents, lifetime_applied_cents, pending_hold_cents'),
    ]);

    const attribs = (attributions.data ?? []) as Array<{ status: string }>;
    const evts = (events.data ?? []) as Array<{ vesting_status: string }>;
    const bals = (balances.data ?? []) as Array<{
      current_balance_cents: number; lifetime_earned_cents: number;
      lifetime_applied_cents: number; pending_hold_cents: number;
    }>;

    const attrByStatus: Record<string, number> = {};
    for (const a of attribs) attrByStatus[a.status] = (attrByStatus[a.status] ?? 0) + 1;
    const evtByStatus: Record<string, number> = {};
    for (const e of evts) evtByStatus[e.vesting_status] = (evtByStatus[e.vesting_status] ?? 0) + 1;

    const sum = (key: keyof typeof bals[number]) => bals.reduce((s, r) => s + (r[key] as number ?? 0), 0);

    rows = [
      { metric: 'codes_total',                  value: (codes.data ?? []).length },
      { metric: 'codes_active',                 value: ((codes.data ?? []) as Array<{ is_active: boolean }>).filter((c) => c.is_active).length },
      { metric: 'attributions_total',           value: attribs.length },
      { metric: 'attributions_verified_active', value: attrByStatus.verified_active ?? 0 },
      { metric: 'attributions_pending',         value: attrByStatus.pending_verification ?? 0 },
      { metric: 'attributions_blocked_self',    value: attrByStatus.blocked_self_referral ?? 0 },
      { metric: 'attributions_blocked_fraud',   value: attrByStatus.blocked_fraud_suspected ?? 0 },
      { metric: 'attributions_voided',          value: attrByStatus.voided ?? 0 },
      { metric: 'milestones_total',             value: evts.length },
      { metric: 'milestones_pending_hold',      value: evtByStatus.pending_hold ?? 0 },
      { metric: 'milestones_vested',            value: evtByStatus.vested ?? 0 },
      { metric: 'milestones_voided_fraud',      value: evtByStatus.voided_fraud ?? 0 },
      { metric: 'milestones_voided_admin',      value: evtByStatus.voided_admin ?? 0 },
      { metric: 'fraud_flags_pending',          value: flagsPending.count ?? 0 },
      { metric: 'credits_lifetime_earned_cents', value: sum('lifetime_earned_cents') },
      { metric: 'credits_lifetime_applied_cents', value: sum('lifetime_applied_cents') },
      { metric: 'credits_outstanding_cents',    value: sum('current_balance_cents') },
      { metric: 'credits_pending_hold_cents',   value: sum('pending_hold_cents') },
      { metric: 'accounts_negative_balance',    value: bals.filter((b) => b.current_balance_cents < 0).length },
    ];
  } else if (section === 'per_referrer') {
    const { data: tiers } = await sb
      .from('practitioner_referral_status_tiers')
      .select(`
        practitioner_id, current_tier, successful_referrals_count,
        bronze_earned_at, silver_earned_at, gold_earned_at, last_updated_at,
        practitioners!inner (practice_name, display_name)
      `)
      .order('successful_referrals_count', { ascending: false })
      .limit(500);
    rows = ((tiers ?? []) as Array<any>).map((t) => ({
      practitioner_id: t.practitioner_id,
      practice_name: t.practitioners?.practice_name ?? t.practitioners?.display_name ?? null,
      current_tier: t.current_tier,
      successful_referrals_count: t.successful_referrals_count,
      bronze_earned_at: t.bronze_earned_at,
      silver_earned_at: t.silver_earned_at,
      gold_earned_at: t.gold_earned_at,
      last_updated_at: t.last_updated_at,
    }));
  } else if (section === 'milestones') {
    const { data } = await sb
      .from('practitioner_referral_milestone_events')
      .select('id, attribution_id, milestone_id, achieved_at, vesting_status, hold_expires_at, vested_at, voided_at, voided_reason, credit_ledger_entry_id')
      .order('achieved_at', { ascending: false })
      .limit(500);
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else if (section === 'financial') {
    const { data } = await sb
      .from('practitioner_referral_credit_ledger')
      .select('id, practitioner_id, entry_type, amount_cents, running_balance_cents, milestone_event_id, applied_to_reference_type, applied_to_reference_id, tax_year, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else if (section === 'tax') {
    const { data } = await sb
      .from('practitioner_referral_tax_earnings')
      .select(`
        practitioner_id, tax_year, total_earned_cents,
        crossed_600_threshold, crossed_600_threshold_at,
        form_1099_required, form_1099_generated, form_1099_generated_at,
        w9_on_file, w9_collected_at,
        practitioners!inner (practice_name, display_name)
      `)
      .order('tax_year', { ascending: false });
    rows = ((data ?? []) as Array<any>).map((t) => ({
      practitioner_id: t.practitioner_id,
      practice_name: t.practitioners?.practice_name ?? t.practitioners?.display_name ?? null,
      tax_year: t.tax_year,
      total_earned_cents: t.total_earned_cents,
      crossed_600_threshold: t.crossed_600_threshold,
      form_1099_required: t.form_1099_required,
      form_1099_generated: t.form_1099_generated,
      form_1099_generated_at: t.form_1099_generated_at,
      w9_on_file: t.w9_on_file,
      w9_collected_at: t.w9_collected_at,
    }));
  }

  if (format === 'csv') {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="practitioner-referrals-${section}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ section, rows });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.reporting', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.reporting', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
