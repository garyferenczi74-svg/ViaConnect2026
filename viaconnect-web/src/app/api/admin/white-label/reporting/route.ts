// Prompt #96 Phase 7: Admin reporting aggregator.
//
// GET /api/admin/white-label/reporting?format=json|csv&section=program|practitioner|compliance|operations|financial
//
// Returns the section's rows shaped for the page or as CSV when
// format=csv is set.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/white-label/csv-export';

export const runtime = 'nodejs';

type Section = 'program' | 'practitioner' | 'compliance' | 'operations' | 'financial';

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const section = (url.searchParams.get('section') ?? 'program') as Section;
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';

  const sb = supabase as any;
  let rows: Array<Record<string, unknown>> = [];

  if (section === 'program') {
    const { data: enrollments } = await sb
      .from('white_label_enrollments')
      .select('id, status, qualifying_path');
    const { data: orders } = await sb
      .from('white_label_production_orders')
      .select('id, status, total_cents, deposit_paid_at');

    const enrollByStatus: Record<string, number> = {};
    const enrollByPath: Record<string, number> = {};
    for (const e of (enrollments ?? []) as Array<{ status: string; qualifying_path: string }>) {
      enrollByStatus[e.status] = (enrollByStatus[e.status] ?? 0) + 1;
      enrollByPath[e.qualifying_path] = (enrollByPath[e.qualifying_path] ?? 0) + 1;
    }
    const orderTotalsByStatus: Record<string, { count: number; total_cents: number }> = {};
    for (const o of (orders ?? []) as Array<{ status: string; total_cents: number }>) {
      const b = orderTotalsByStatus[o.status] ??= { count: 0, total_cents: 0 };
      b.count += 1;
      b.total_cents += o.total_cents ?? 0;
    }
    rows = [
      { metric: 'enrolled_total',                value: (enrollments ?? []).length },
      { metric: 'enrolled_active',               value: enrollByStatus.active ?? 0 },
      { metric: 'enrolled_pending_eligibility',  value: enrollByStatus.pending_eligibility ?? 0 },
      { metric: 'enrolled_terminated',           value: enrollByStatus.terminated ?? 0 },
      { metric: 'qualified_certification',       value: enrollByPath.certification_level_3 ?? 0 },
      { metric: 'qualified_subscription',        value: enrollByPath.white_label_tier_subscription ?? 0 },
      { metric: 'qualified_volume',              value: enrollByPath.volume_threshold ?? 0 },
      ...Object.entries(orderTotalsByStatus).map(([status, b]) => ({
        metric: `orders_${status}_count`,         value: b.count,
      })),
      ...Object.entries(orderTotalsByStatus).map(([status, b]) => ({
        metric: `orders_${status}_total_cents`,   value: b.total_cents,
      })),
    ];
  } else if (section === 'practitioner') {
    const { data } = await sb
      .from('white_label_economics')
      .select('practitioner_id, enrollment_status, lifetime_production_orders, lifetime_production_revenue_cents, average_production_order_cents, total_units_sold_to_patients, units_on_hand, storage_fees_accrued_cents, most_recent_delivery_at');
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else if (section === 'compliance') {
    const { data } = await sb
      .from('white_label_compliance_reviews')
      .select('id, label_design_id, review_type, reviewer_role, decision, reviewed_at, review_duration_seconds')
      .order('reviewed_at', { ascending: false })
      .limit(500);
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else if (section === 'operations') {
    const { data } = await sb
      .from('white_label_production_orders')
      .select('id, order_number, status, production_timeline, total_units, total_cents, quoted_at, production_started_at, quality_control_completed_at, shipped_at, delivered_at')
      .order('created_at', { ascending: false })
      .limit(500);
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else if (section === 'financial') {
    const { data: orders } = await sb
      .from('white_label_production_orders')
      .select('id, order_number, status, total_cents, deposit_amount_cents, final_payment_amount_cents, deposit_paid_at, final_payment_paid_at, deposit_refunded');
    rows = ((orders ?? []) as Array<{
      id: string; order_number: string; status: string;
      total_cents: number; deposit_amount_cents: number; final_payment_amount_cents: number;
      deposit_paid_at: string | null; final_payment_paid_at: string | null; deposit_refunded: boolean;
    }>).map((o) => ({
      ...o,
      deposit_outstanding_cents: o.deposit_paid_at ? 0 : o.deposit_amount_cents,
      final_outstanding_cents: o.final_payment_paid_at ? 0 : o.final_payment_amount_cents,
    }));
  }

  if (format === 'csv') {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="white-label-${section}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  return NextResponse.json({ section, rows });
}
