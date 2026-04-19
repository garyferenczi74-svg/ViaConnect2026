// Prompt #94 Phase 7.2: Snapshot builder + alert evaluation.
//
// Pure logic the monthly snapshot Edge Function calls per segment. Inputs
// are pre-aggregated counts + cents (so this file does not touch the DB).
// Outputs are a fully-derived snapshot row + an array of threshold-breach
// alerts ready to insert into unit_economics_alerts.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotInputs {
  snapshotMonthIso: string;            // YYYY-MM-01
  segmentType: string;
  segmentValue: string;

  newCustomersCount: number;
  activeCustomersCount: number;
  churnedCustomersCount: number;
  activeCustomersStartOfMonth: number; // for monthly_churn_rate denominator

  totalRevenueCents: number;
  subscriptionRevenueCents: number;
  supplementRevenueCents: number;
  genex360RevenueCents: number;
  practitionerSubscriptionRevenueCents: number;
  certificationRevenueCents: number;

  cogsCents: number;
  shippingCostCents: number;
  paymentProcessingCents: number;
  helixRedemptionCostCents: number;

  marketingSpendCents: number;
  blendedCacCents: number | null;
  paybackPeriodMonths: number | null;

  ltv12moCents: number | null;
  ltv24moCents: number | null;
  ltv36moCents: number | null;

  netRevenueRetentionPercent: number | null;
  grossRevenueRetentionPercent: number | null;

  arpuCents: number | null;
  mrrCents: number;
  activeMembershipCount: number;
  averageMrrPerMembershipCents: number | null;
}

export interface ComputedSnapshot {
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

// ---------------------------------------------------------------------------
// Pure compute
// ---------------------------------------------------------------------------

export function computeSnapshotMetrics(input: SnapshotInputs): ComputedSnapshot {
  const totalVariable =
    input.cogsCents +
    input.shippingCostCents +
    input.paymentProcessingCents +
    input.helixRedemptionCostCents;

  const contribution = input.totalRevenueCents - totalVariable;
  const contributionPct = input.totalRevenueCents > 0
    ? round3((contribution / input.totalRevenueCents) * 100)
    : null;

  const ltvCacRatio = (ltv: number | null): number | null => {
    if (ltv == null || input.blendedCacCents == null || input.blendedCacCents === 0) return null;
    return round3(ltv / input.blendedCacCents);
  };

  const monthlyChurn = input.activeCustomersStartOfMonth > 0
    ? round3((input.churnedCustomersCount / input.activeCustomersStartOfMonth) * 100)
    : null;

  const annualChurn = monthlyChurn != null
    ? round3((1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100)
    : null;

  return {
    snapshot_month: input.snapshotMonthIso,
    segment_type: input.segmentType,
    segment_value: input.segmentValue,

    new_customers_count: input.newCustomersCount,
    active_customers_count: input.activeCustomersCount,
    churned_customers_count: input.churnedCustomersCount,

    total_revenue_cents: input.totalRevenueCents,
    subscription_revenue_cents: input.subscriptionRevenueCents,
    supplement_revenue_cents: input.supplementRevenueCents,
    genex360_revenue_cents: input.genex360RevenueCents,
    practitioner_subscription_revenue_cents: input.practitionerSubscriptionRevenueCents,
    certification_revenue_cents: input.certificationRevenueCents,

    cogs_cents: input.cogsCents,
    shipping_cost_cents: input.shippingCostCents,
    payment_processing_cents: input.paymentProcessingCents,
    helix_redemption_cost_cents: input.helixRedemptionCostCents,
    total_variable_cost_cents: totalVariable,

    contribution_margin_cents: contribution,
    contribution_margin_percent: contributionPct,

    marketing_spend_cents: input.marketingSpendCents,
    blended_cac_cents: input.blendedCacCents,
    payback_period_months: input.paybackPeriodMonths,

    ltv_12mo_cents: input.ltv12moCents,
    ltv_24mo_cents: input.ltv24moCents,
    ltv_36mo_cents: input.ltv36moCents,

    ltv_cac_ratio_12mo: ltvCacRatio(input.ltv12moCents),
    ltv_cac_ratio_24mo: ltvCacRatio(input.ltv24moCents),
    ltv_cac_ratio_36mo: ltvCacRatio(input.ltv36moCents),

    net_revenue_retention_percent: input.netRevenueRetentionPercent,
    gross_revenue_retention_percent: input.grossRevenueRetentionPercent,
    monthly_churn_rate_percent: monthlyChurn,
    annual_churn_rate_percent: annualChurn,

    arpu_cents: input.arpuCents,
    mrr_cents: input.mrrCents,
    arr_cents: input.mrrCents * 12,
  };
}

// ---------------------------------------------------------------------------
// Alert evaluation
// ---------------------------------------------------------------------------

export const ALERT_THRESHOLDS = {
  LTV_CAC_MIN: 1.0,                 // ratio below this triggers alert
  LTV_CAC_WARNING: 3.0,             // warning band; below this is "thin"
  PAYBACK_MAX_MONTHS: 18,           // payback above triggers alert
  GRR_MIN_PERCENT: 85,              // GRR below triggers alert
  NRR_MIN_PERCENT: 100,             // NRR below 100 means net contraction
  MONTHLY_CHURN_MAX_PERCENT: 5,     // monthly churn above triggers alert
  CONTRIBUTION_MARGIN_MIN_PERCENT: 50, // margin below triggers alert
  CAC_MAX_CENTS: 20000,             // > $200 CAC triggers alert (cents)
} as const;

export interface Alert {
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

export function evaluateAlerts(s: ComputedSnapshot): Alert[] {
  const alerts: Alert[] = [];
  const where = s.segment_type === 'overall'
    ? 'overall'
    : `${s.segment_type}=${s.segment_value}`;

  if (s.ltv_cac_ratio_24mo != null && s.ltv_cac_ratio_24mo < ALERT_THRESHOLDS.LTV_CAC_MIN) {
    alerts.push({
      alert_type: 'ltv_cac_below_threshold',
      severity: 'critical',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.LTV_CAC_MIN,
      current_value: s.ltv_cac_ratio_24mo,
      message: `${where}: 24-mo LTV:CAC is ${s.ltv_cac_ratio_24mo.toFixed(2)}x; below the ${ALERT_THRESHOLDS.LTV_CAC_MIN}x floor. Acquisition is unprofitable.`,
      raw_payload: { ltv_24mo_cents: s.ltv_24mo_cents, blended_cac_cents: s.blended_cac_cents },
    });
  } else if (s.ltv_cac_ratio_24mo != null && s.ltv_cac_ratio_24mo < ALERT_THRESHOLDS.LTV_CAC_WARNING) {
    alerts.push({
      alert_type: 'ltv_cac_below_threshold',
      severity: 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.LTV_CAC_WARNING,
      current_value: s.ltv_cac_ratio_24mo,
      message: `${where}: 24-mo LTV:CAC is ${s.ltv_cac_ratio_24mo.toFixed(2)}x; below the healthy ${ALERT_THRESHOLDS.LTV_CAC_WARNING}x band.`,
      raw_payload: { ltv_24mo_cents: s.ltv_24mo_cents, blended_cac_cents: s.blended_cac_cents },
    });
  }

  if (s.payback_period_months != null && s.payback_period_months > ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS) {
    alerts.push({
      alert_type: 'payback_above_threshold',
      severity: s.payback_period_months > ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS * 1.5 ? 'critical' : 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS,
      current_value: s.payback_period_months,
      message: `${where}: payback period is ${s.payback_period_months.toFixed(1)} months; above the ${ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS}-month threshold. Cash runway pressure.`,
      raw_payload: {},
    });
  }

  if (s.gross_revenue_retention_percent != null && s.gross_revenue_retention_percent < ALERT_THRESHOLDS.GRR_MIN_PERCENT) {
    alerts.push({
      alert_type: 'grr_below_threshold',
      severity: 'critical',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.GRR_MIN_PERCENT,
      current_value: s.gross_revenue_retention_percent,
      message: `${where}: GRR is ${s.gross_revenue_retention_percent.toFixed(1)}%; below the ${ALERT_THRESHOLDS.GRR_MIN_PERCENT}% floor. Customers are leaving faster than expansion can offset.`,
      raw_payload: {},
    });
  }

  if (s.net_revenue_retention_percent != null && s.net_revenue_retention_percent < ALERT_THRESHOLDS.NRR_MIN_PERCENT) {
    alerts.push({
      alert_type: 'nrr_below_threshold',
      severity: s.net_revenue_retention_percent < 90 ? 'critical' : 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.NRR_MIN_PERCENT,
      current_value: s.net_revenue_retention_percent,
      message: `${where}: NRR is ${s.net_revenue_retention_percent.toFixed(1)}%; below 100%. The base is contracting in dollar terms.`,
      raw_payload: {},
    });
  }

  if (s.monthly_churn_rate_percent != null && s.monthly_churn_rate_percent > ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT) {
    alerts.push({
      alert_type: 'monthly_churn_above_threshold',
      severity: s.monthly_churn_rate_percent > 8 ? 'critical' : 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT,
      current_value: s.monthly_churn_rate_percent,
      message: `${where}: monthly churn is ${s.monthly_churn_rate_percent.toFixed(2)}%; above the ${ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT}% ceiling. Investigate cohort drivers.`,
      raw_payload: {},
    });
  }

  if (s.contribution_margin_percent != null && s.contribution_margin_percent < ALERT_THRESHOLDS.CONTRIBUTION_MARGIN_MIN_PERCENT) {
    alerts.push({
      alert_type: 'contribution_margin_below_threshold',
      severity: 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.CONTRIBUTION_MARGIN_MIN_PERCENT,
      current_value: s.contribution_margin_percent,
      message: `${where}: contribution margin is ${s.contribution_margin_percent.toFixed(1)}%; below the ${ALERT_THRESHOLDS.CONTRIBUTION_MARGIN_MIN_PERCENT}% target. Variable costs are compressing unit economics.`,
      raw_payload: {
        cogs_cents: s.cogs_cents,
        shipping_cost_cents: s.shipping_cost_cents,
        payment_processing_cents: s.payment_processing_cents,
        helix_redemption_cost_cents: s.helix_redemption_cost_cents,
      },
    });
  }

  if (s.blended_cac_cents != null && s.blended_cac_cents > ALERT_THRESHOLDS.CAC_MAX_CENTS) {
    alerts.push({
      alert_type: 'cac_above_threshold',
      severity: 'warning',
      snapshot_month: s.snapshot_month,
      segment_type: s.segment_type,
      segment_value: s.segment_value,
      threshold_value: ALERT_THRESHOLDS.CAC_MAX_CENTS,
      current_value: s.blended_cac_cents,
      message: `${where}: blended CAC is $${(s.blended_cac_cents / 100).toFixed(0)}; above the $${(ALERT_THRESHOLDS.CAC_MAX_CENTS / 100).toFixed(0)} ceiling.`,
      raw_payload: {},
    });
  }

  return alerts;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
