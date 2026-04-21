// Prompt #104 Phase 7: Settlements list + revenue-recovery KPI.
//
// GET /api/admin/legal/settlements?paid_only=true&since_iso=...
//   -> rows ordered by settlement_date desc + KPI aggregates
//      (recovery_ytd_cents = sum of monetary_amount_cents WHERE
//      payment_received_at IS NOT NULL AND in current calendar year).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const READ_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops', 'cfo', 'ceo']);

interface ProfileLite { role: string }

async function requireRole(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !READ_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Insufficient role' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface SettlementListRow {
  settlement_id: string;
  case_id: string;
  settlement_date: string;
  monetary_amount_cents: number;
  currency: string;
  approval_tier: string;
  approved_at: string | null;
  cfo_approved_at: string | null;
  ceo_approved_at: string | null;
  executed_at: string | null;
  payment_received_at: string | null;
  legal_investigation_cases: { case_label: string } | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireRole(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const paidOnly = url.searchParams.get('paid_only') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb.from('legal_case_settlements')
    .select(`settlement_id, case_id, settlement_date, monetary_amount_cents, currency, approval_tier,
             approved_at, cfo_approved_at, ceo_approved_at, executed_at, payment_received_at,
             legal_investigation_cases ( case_label )`)
    .order('settlement_date', { ascending: false })
    .limit(200);
  if (paidOnly) q = q.not('payment_received_at', 'is', null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as SettlementListRow[];

  // KPI: recovery YTD = sum of paid settlements in current UTC year.
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString();
  const ytdRows = rows.filter((r) => r.payment_received_at !== null && r.payment_received_at >= yearStart);
  const recoveryYtdCents = ytdRows.reduce((s, r) => s + (r.monetary_amount_cents ?? 0), 0);
  const totalRecoveryCents = rows.filter((r) => r.payment_received_at !== null).reduce((s, r) => s + (r.monetary_amount_cents ?? 0), 0);

  return NextResponse.json({
    rows: rows.map((r) => ({
      settlement_id: r.settlement_id,
      case_id: r.case_id,
      case_label: r.legal_investigation_cases?.case_label ?? null,
      settlement_date: r.settlement_date,
      monetary_amount_cents: r.monetary_amount_cents,
      currency: r.currency,
      approval_tier: r.approval_tier,
      approved_at: r.approved_at,
      cfo_approved_at: r.cfo_approved_at,
      ceo_approved_at: r.ceo_approved_at,
      executed_at: r.executed_at,
      payment_received_at: r.payment_received_at,
    })),
    kpi: {
      recovery_ytd_cents: recoveryYtdCents,
      recovery_lifetime_cents: totalRecoveryCents,
      paid_settlement_count_ytd: ytdRows.length,
      paid_settlement_count_lifetime: rows.filter((r) => r.payment_received_at !== null).length,
    },
  });
}
