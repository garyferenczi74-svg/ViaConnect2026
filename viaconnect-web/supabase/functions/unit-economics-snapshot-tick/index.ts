// =============================================================================
// unit-economics-snapshot-tick Edge Function
// =============================================================================
// Monthly tick (scheduled by 20260418000390_unit_economics_snapshot_cron.sql)
// that computes the overall unit economics rollup for the most recently
// completed month and upserts it into unit_economics_snapshots, then
// evaluates threshold alerts and writes each breach to
// unit_economics_alerts (idempotent on alert_type + month + segment).
//
// Aggregation sources:
//   - shop_orders                          revenue, supplement subset
//   - memberships                          subscription_revenue + active count
//   - genex360_purchases                   genex revenue
//   - marketing_spend                      blended CAC denominator
//   - customer_acquisition_attribution     new_customers_count this month
//   - cohort_customer_monthly              activeCustomersStartOfMonth + churn
//
// Heartbeats to ultrathink_agent_registry on every successful run so
// Jeffery can monitor liveness.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Numeric thresholds — kept in lockstep with src/lib/analytics/snapshot-builder.ts
const ALERT_THRESHOLDS = {
  LTV_CAC_MIN: 1.0,
  LTV_CAC_WARNING: 3.0,
  PAYBACK_MAX_MONTHS: 18,
  GRR_MIN_PERCENT: 85,
  NRR_MIN_PERCENT: 100,
  MONTHLY_CHURN_MAX_PERCENT: 5,
  CONTRIBUTION_MARGIN_MIN_PERCENT: 50,
  CAC_MAX_CENTS: 200_00,
};

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

async function heartbeat(
  db: SupabaseClient,
  runId: string,
  ok: boolean,
  payload: Record<string, unknown>,
) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'unit-economics-snapshot-tick',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[unit-economics-snapshot-tick] heartbeat failed', (e as Error).message);
  }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function previousMonthIso(now: Date): string {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function nextMonthIso(monthIso: string): string {
  const [y, m] = monthIso.split('-').map(Number);
  const year = m === 12 ? y + 1 : y;
  const month = m === 12 ? 1 : m + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

interface SnapshotRow {
  snapshot_month: string;
  segment_type: string;
  segment_value: string;
  new_customers_count: number;
  active_customers_count: number;
  churned_customers_count: number;
  total_revenue_cents: number;
  subscription_revenue_cents: number;
  supplement_revenue_cents: number;
  genex360_revenue_cents: number;
  practitioner_subscription_revenue_cents: number;
  certification_revenue_cents: number;
  cogs_cents: number;
  shipping_cost_cents: number;
  payment_processing_cents: number;
  helix_redemption_cost_cents: number;
  total_variable_cost_cents: number;
  contribution_margin_cents: number;
  contribution_margin_percent: number | null;
  marketing_spend_cents: number;
  blended_cac_cents: number | null;
  payback_period_months: number | null;
  ltv_12mo_cents: number | null;
  ltv_24mo_cents: number | null;
  ltv_36mo_cents: number | null;
  ltv_cac_ratio_12mo: number | null;
  ltv_cac_ratio_24mo: number | null;
  ltv_cac_ratio_36mo: number | null;
  net_revenue_retention_percent: number | null;
  gross_revenue_retention_percent: number | null;
  monthly_churn_rate_percent: number | null;
  annual_churn_rate_percent: number | null;
  arpu_cents: number | null;
  mrr_cents: number;
  arr_cents: number;
}

async function aggregateOverall(db: SupabaseClient, monthIso: string): Promise<SnapshotRow> {
  const monthEndIso = nextMonthIso(monthIso);

  const [
    { data: orders },
    { data: memberships },
    { data: genexRows },
    { data: spend },
    { data: newCustomers },
    { data: cohortRows },
  ] = await Promise.all([
    db.from('shop_orders')
      .select('user_id, total_cents, shipping_cost_cents, payment_processing_cents, cogs_cents, contribution_margin_cents, created_at')
      .gte('created_at', `${monthIso}T00:00:00.000Z`)
      .lt('created_at', `${monthEndIso}T00:00:00.000Z`),
    db.from('memberships')
      .select('user_id, tier_id, status, monthly_price_cents, started_at, canceled_at')
      .lte('started_at', `${monthEndIso}T00:00:00.000Z`),
    db.from('genex360_purchases')
      .select('user_id, price_cents, created_at, payment_status')
      .gte('created_at', `${monthIso}T00:00:00.000Z`)
      .lt('created_at', `${monthEndIso}T00:00:00.000Z`)
      .eq('payment_status', 'paid'),
    db.from('marketing_spend')
      .select('amount_cents')
      .eq('spend_month', monthIso),
    db.from('customer_acquisition_attribution')
      .select('user_id, first_touch_at')
      .gte('first_touch_at', `${monthIso}T00:00:00.000Z`)
      .lt('first_touch_at', `${monthEndIso}T00:00:00.000Z`),
    db.from('cohort_customer_monthly')
      .select('user_id, was_active_strict')
      .eq('activity_month', monthIso),
  ]);

  const orderRows = (orders ?? []) as Array<{ total_cents: number | null; shipping_cost_cents: number | null; payment_processing_cents: number | null; cogs_cents: number | null; contribution_margin_cents: number | null }>;
  const totalRevenue = orderRows.reduce((s, r) => s + (r.total_cents ?? 0), 0);
  const cogs         = orderRows.reduce((s, r) => s + (r.cogs_cents ?? 0), 0);
  const shipping     = orderRows.reduce((s, r) => s + (r.shipping_cost_cents ?? 0), 0);
  const payment      = orderRows.reduce((s, r) => s + (r.payment_processing_cents ?? 0), 0);
  const supplementRevenue = totalRevenue;

  const m = (memberships ?? []) as Array<{ tier_id: string | null; status: string | null; monthly_price_cents: number | null; started_at: string | null; canceled_at: string | null }>;
  const activeMemberships = m.filter((row) => row.status === 'active' && (!row.canceled_at || row.canceled_at >= monthEndIso));
  const subscriptionRevenue = activeMemberships.reduce((s, r) => s + (r.monthly_price_cents ?? 0), 0);
  const mrr = subscriptionRevenue;
  const activeMembershipCount = activeMemberships.length;

  const g = (genexRows ?? []) as Array<{ price_cents: number | null }>;
  const genexRevenue = g.reduce((s, r) => s + (r.price_cents ?? 0), 0);

  const spendRows = (spend ?? []) as Array<{ amount_cents: number }>;
  const marketingSpend = spendRows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);

  const newCount = ((newCustomers ?? []) as unknown[]).length;
  const blendedCac = newCount > 0 ? Math.round(marketingSpend / newCount) : null;

  // Churned this month: rows in cohort_customer_monthly with was_active_strict=false who were active last month.
  const c = (cohortRows ?? []) as Array<{ user_id: string; was_active_strict: boolean }>;
  const activeNow = c.filter((r) => r.was_active_strict).length;

  const lastMonthIso = previousMonthIso(new Date(`${monthIso}T12:00:00.000Z`));
  const { data: lastMonthCohort } = await db
    .from('cohort_customer_monthly')
    .select('user_id, was_active_strict')
    .eq('activity_month', lastMonthIso);
  const lastActiveSet = new Set(
    ((lastMonthCohort ?? []) as Array<{ user_id: string; was_active_strict: boolean }>)
      .filter((r) => r.was_active_strict)
      .map((r) => r.user_id),
  );
  const activeNowSet = new Set(c.filter((r) => r.was_active_strict).map((r) => r.user_id));
  let churned = 0;
  for (const id of lastActiveSet) {
    if (!activeNowSet.has(id)) churned++;
  }
  const startOfMonth = lastActiveSet.size;

  const totalVariable = cogs + shipping + payment;
  const contribution = totalRevenue - totalVariable;
  const contributionPct = totalRevenue > 0 ? round3((contribution / totalRevenue) * 100) : null;

  const monthlyChurn = startOfMonth > 0 ? round3((churned / startOfMonth) * 100) : null;
  const annualChurn = monthlyChurn != null
    ? round3((1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100)
    : null;

  const arpu = activeNow > 0 ? Math.round(totalRevenue / activeNow) : null;

  return {
    snapshot_month: monthIso,
    segment_type: 'overall',
    segment_value: 'all',
    new_customers_count: newCount,
    active_customers_count: activeNow,
    churned_customers_count: churned,
    total_revenue_cents: totalRevenue,
    subscription_revenue_cents: subscriptionRevenue,
    supplement_revenue_cents: supplementRevenue,
    genex360_revenue_cents: genexRevenue,
    practitioner_subscription_revenue_cents: 0,
    certification_revenue_cents: 0,
    cogs_cents: cogs,
    shipping_cost_cents: shipping,
    payment_processing_cents: payment,
    helix_redemption_cost_cents: 0,
    total_variable_cost_cents: totalVariable,
    contribution_margin_cents: contribution,
    contribution_margin_percent: contributionPct,
    marketing_spend_cents: marketingSpend,
    blended_cac_cents: blendedCac,
    payback_period_months: null,
    ltv_12mo_cents: null,
    ltv_24mo_cents: null,
    ltv_36mo_cents: null,
    ltv_cac_ratio_12mo: null,
    ltv_cac_ratio_24mo: null,
    ltv_cac_ratio_36mo: null,
    net_revenue_retention_percent: null,
    gross_revenue_retention_percent: null,
    monthly_churn_rate_percent: monthlyChurn,
    annual_churn_rate_percent: annualChurn,
    arpu_cents: arpu,
    mrr_cents: mrr,
    arr_cents: mrr * 12,
  };
}

async function upsertSnapshot(db: SupabaseClient, snap: SnapshotRow): Promise<void> {
  await db
    .from('unit_economics_snapshots')
    .upsert(
      { ...snap, snapshot_type: 'monthly' },
      { onConflict: 'snapshot_month,segment_type,segment_value,snapshot_type' },
    );
}

interface AlertRow {
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  snapshot_month: string;
  segment_type: string;
  segment_value: string;
  threshold_value: number | null;
  current_value: number | null;
  message: string;
  raw_payload: Record<string, unknown>;
}

function evaluateAlerts(s: SnapshotRow): AlertRow[] {
  const alerts: AlertRow[] = [];
  const where = s.segment_type === 'overall' ? 'overall' : `${s.segment_type}=${s.segment_value}`;
  const base = {
    snapshot_month: s.snapshot_month,
    segment_type: s.segment_type,
    segment_value: s.segment_value,
  };

  if (s.ltv_cac_ratio_24mo != null && s.ltv_cac_ratio_24mo < ALERT_THRESHOLDS.LTV_CAC_MIN) {
    alerts.push({ ...base, alert_type: 'ltv_cac_below_threshold', severity: 'critical',
      threshold_value: ALERT_THRESHOLDS.LTV_CAC_MIN, current_value: s.ltv_cac_ratio_24mo,
      message: `${where}: 24-mo LTV:CAC is ${s.ltv_cac_ratio_24mo.toFixed(2)}x; below ${ALERT_THRESHOLDS.LTV_CAC_MIN}x.`,
      raw_payload: {} });
  }
  if (s.payback_period_months != null && s.payback_period_months > ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS) {
    alerts.push({ ...base, alert_type: 'payback_above_threshold',
      severity: s.payback_period_months > ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS * 1.5 ? 'critical' : 'warning',
      threshold_value: ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS, current_value: s.payback_period_months,
      message: `${where}: payback is ${s.payback_period_months.toFixed(1)} mo; above ${ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS}.`,
      raw_payload: {} });
  }
  if (s.gross_revenue_retention_percent != null && s.gross_revenue_retention_percent < ALERT_THRESHOLDS.GRR_MIN_PERCENT) {
    alerts.push({ ...base, alert_type: 'grr_below_threshold', severity: 'critical',
      threshold_value: ALERT_THRESHOLDS.GRR_MIN_PERCENT, current_value: s.gross_revenue_retention_percent,
      message: `${where}: GRR is ${s.gross_revenue_retention_percent.toFixed(1)}%.`,
      raw_payload: {} });
  }
  if (s.net_revenue_retention_percent != null && s.net_revenue_retention_percent < ALERT_THRESHOLDS.NRR_MIN_PERCENT) {
    alerts.push({ ...base, alert_type: 'nrr_below_threshold',
      severity: s.net_revenue_retention_percent < 90 ? 'critical' : 'warning',
      threshold_value: ALERT_THRESHOLDS.NRR_MIN_PERCENT, current_value: s.net_revenue_retention_percent,
      message: `${where}: NRR is ${s.net_revenue_retention_percent.toFixed(1)}%.`,
      raw_payload: {} });
  }
  if (s.monthly_churn_rate_percent != null && s.monthly_churn_rate_percent > ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT) {
    alerts.push({ ...base, alert_type: 'monthly_churn_above_threshold',
      severity: s.monthly_churn_rate_percent > 8 ? 'critical' : 'warning',
      threshold_value: ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT, current_value: s.monthly_churn_rate_percent,
      message: `${where}: monthly churn is ${s.monthly_churn_rate_percent.toFixed(2)}%.`,
      raw_payload: {} });
  }
  if (s.contribution_margin_percent != null && s.contribution_margin_percent < ALERT_THRESHOLDS.CONTRIBUTION_MARGIN_MIN_PERCENT) {
    alerts.push({ ...base, alert_type: 'contribution_margin_below_threshold', severity: 'warning',
      threshold_value: ALERT_THRESHOLDS.CONTRIBUTION_MARGIN_MIN_PERCENT, current_value: s.contribution_margin_percent,
      message: `${where}: margin is ${s.contribution_margin_percent.toFixed(1)}%.`,
      raw_payload: {} });
  }
  if (s.blended_cac_cents != null && s.blended_cac_cents > ALERT_THRESHOLDS.CAC_MAX_CENTS) {
    alerts.push({ ...base, alert_type: 'cac_above_threshold', severity: 'warning',
      threshold_value: ALERT_THRESHOLDS.CAC_MAX_CENTS, current_value: s.blended_cac_cents,
      message: `${where}: CAC is $${(s.blended_cac_cents / 100).toFixed(0)}.`,
      raw_payload: {} });
  }
  return alerts;
}

async function persistAlerts(db: SupabaseClient, alerts: AlertRow[]): Promise<void> {
  if (alerts.length === 0) return;
  await db
    .from('unit_economics_alerts')
    .upsert(alerts, { onConflict: 'alert_type,snapshot_month,segment_type,segment_value' });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    let monthIso: string | null = null;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      monthIso = (body?.snapshot_month as string | undefined) ?? null;
    }
    if (!monthIso) {
      monthIso = previousMonthIso(new Date());
    }

    const overall = await aggregateOverall(db, monthIso);
    await upsertSnapshot(db, overall);

    const alerts = evaluateAlerts(overall);
    await persistAlerts(db, alerts);

    await heartbeat(db, runId, true, {
      monthIso,
      alerts: alerts.length,
      durationMs: Date.now() - startedAt,
    });

    return json({
      status: 'ok',
      runId,
      snapshot_month: monthIso,
      alerts_written: alerts.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
