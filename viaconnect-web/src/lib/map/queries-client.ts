// Prompt #100 MAP Enforcement — browser-side Supabase loaders.
//
// All reads hit RLS-gated tables; the policies restrict each caller
// to their own rows. Admin callers see everything.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MAPComplianceScoreRow,
  MAPSeverity,
  MAPViolationRow,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any;

function asLoose(supabase: SupabaseClient): LooseClient {
  return supabase as unknown as LooseClient;
}

export interface ActiveViolationView extends MAPViolationRow {
  productName: string | null;
  productSku: string | null;
  sourceUrl: string;
}

/** Fetch active violations for the signed-in practitioner, joined
 *  with product + observation details. RLS scopes this to their
 *  own rows. */
export async function fetchMyActiveViolations(
  supabase: SupabaseClient,
): Promise<ActiveViolationView[]> {
  // source_url is denormalized onto map_violations (migration _016)
  // so practitioners can read it under their own RLS without pulling
  // from the admin-only map_price_observations table.
  const { data } = await asLoose(supabase)
    .from('map_violations')
    .select(
      'violation_id, observation_id, product_id, practitioner_id, policy_id, severity, observed_price_cents, map_price_cents, discount_pct_below_map, status, grace_period_ends_at, remediation_deadline_at, notified_at, acknowledged_at, remediated_at, escalated_at, dismissed_at, created_at, source_url, products(name, sku)',
    )
    .in('status', ['active', 'notified', 'acknowledged', 'escalated'])
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    violationId: r.violation_id as string,
    observationId: r.observation_id as string,
    productId: r.product_id as string,
    practitionerId: (r.practitioner_id as string | null) ?? null,
    policyId: r.policy_id as string,
    severity: r.severity as MAPSeverity,
    observedPriceCents: Number(r.observed_price_cents ?? 0),
    mapPriceCents: Number(r.map_price_cents ?? 0),
    discountPctBelowMap: Number(r.discount_pct_below_map ?? 0),
    status: r.status as MAPViolationRow['status'],
    gracePeriodEndsAt: String(r.grace_period_ends_at ?? ''),
    remediationDeadlineAt: String(r.remediation_deadline_at ?? ''),
    notifiedAt: (r.notified_at as string | null) ?? null,
    acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
    remediatedAt: (r.remediated_at as string | null) ?? null,
    escalatedAt: (r.escalated_at as string | null) ?? null,
    dismissedAt: (r.dismissed_at as string | null) ?? null,
    createdAt: String(r.created_at ?? ''),
    productName: ((r.products as { name?: string } | null) ?? {}).name ?? null,
    productSku: ((r.products as { sku?: string } | null) ?? {}).sku ?? null,
    sourceUrl: (r.source_url as string | null) ?? '',
  }));
}

/** Fetch the latest compliance score row for the signed-in
 *  practitioner. Returns null when no history exists. */
export async function fetchMyComplianceScore(
  supabase: SupabaseClient,
): Promise<MAPComplianceScoreRow | null> {
  const { data } = await asLoose(supabase)
    .from('map_compliance_scores')
    .select('*')
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    scoreId: r.score_id as string,
    practitionerId: r.practitioner_id as string,
    score: Number(r.score ?? 0),
    mapComplianceTier: r.map_compliance_tier as MAPComplianceScoreRow['mapComplianceTier'],
    yellowViolations90d: Number(r.yellow_violations_90d ?? 0),
    orangeViolations90d: Number(r.orange_violations_90d ?? 0),
    redViolations90d: Number(r.red_violations_90d ?? 0),
    blackViolations90d: Number(r.black_violations_90d ?? 0),
    daysSinceLastViolation: Number(r.days_since_last_violation ?? 0),
    selfReportedRemediations: Number(r.self_reported_remediations ?? 0),
    calculatedAt: String(r.calculated_at ?? ''),
    calculatedDate: String(r.calculated_date ?? ''),
  };
}

/** Fetch 30-day trend of compliance scores for the sparkline. Pulls
 *  the 30 MOST RECENT rows (descending query + JS reverse for display). */
export async function fetchComplianceScoreTrend(
  supabase: SupabaseClient,
): Promise<Array<{ calculatedDate: string; score: number }>> {
  const { data } = await asLoose(supabase)
    .from('map_compliance_scores')
    .select('calculated_date, score')
    .order('calculated_date', { ascending: false })
    .limit(30);
  const rows = (data ?? []) as Array<{ calculated_date: string; score: number }>;
  return rows
    .map((r) => ({ calculatedDate: r.calculated_date, score: Number(r.score ?? 0) }))
    .reverse();
}

import type { MAPPillState } from './types';

export interface ProductMAPStatus {
  productId: string;
  productName: string | null;
  productSku: string | null;
  pricingTier: string;
  pillState: MAPPillState;
  violationId: string | null;
  exemptLabel: 'L3' | 'L4' | null;
}

/** Pure: map a MAP violation's severity + status onto the pricing-status
 *  pill state consumed by the Revenue Intelligence page. Exported so
 *  unit tests can exercise every branch without a Supabase round-trip. */
export function severityToPillState(
  severity: string,
  status: string,
): MAPPillState {
  if (status === 'remediated' || status === 'dismissed') return 'compliant';
  switch (severity) {
    case 'yellow': return 'monitored';
    case 'orange': return 'warning';
    case 'red': return 'violation';
    case 'black': return 'critical';
    default: return 'compliant';
  }
}

/** Per-product MAP status for the revenue page pills. Reads the most
 *  recent non-remediated violation per (practitioner, product) and
 *  maps to a pill state. L3 + L4 products return 'exempt' with the
 *  tier label. */
export async function fetchMyProductMAPStatus(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<ProductMAPStatus[]> {
  if (productIds.length === 0) return [];
  const { data: products } = await asLoose(supabase)
    .from('products')
    .select('id, name, sku, pricing_tier')
    .in('id', productIds);
  const productRows = (products ?? []) as Array<{
    id: string;
    name: string | null;
    sku: string | null;
    pricing_tier: string;
  }>;

  const l1l2Ids = productRows.filter((p) => p.pricing_tier === 'L1' || p.pricing_tier === 'L2').map((p) => p.id);

  const { data: violations } = await asLoose(supabase)
    .from('map_violations')
    .select('violation_id, product_id, severity, status')
    .in('product_id', l1l2Ids.length > 0 ? l1l2Ids : ['00000000-0000-0000-0000-000000000000'])
    .in('status', ['active', 'notified', 'acknowledged', 'escalated']);
  const vRows = (violations ?? []) as Array<Record<string, unknown>>;
  const byProduct = new Map<string, { violationId: string; severity: string; status: string }>();
  for (const v of vRows) {
    const pid = v.product_id as string;
    byProduct.set(pid, {
      violationId: v.violation_id as string,
      severity: v.severity as string,
      status: v.status as string,
    });
  }

  return productRows.map((p) => {
    if (p.pricing_tier === 'L3' || p.pricing_tier === 'L4') {
      return {
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        pricingTier: p.pricing_tier,
        pillState: 'exempt' as const,
        violationId: null,
        exemptLabel: (p.pricing_tier as 'L3' | 'L4'),
      };
    }
    const hit = byProduct.get(p.id);
    if (!hit) {
      return {
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        pricingTier: p.pricing_tier,
        pillState: 'compliant' as const,
        violationId: null,
        exemptLabel: null,
      };
    }
    return {
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      pricingTier: p.pricing_tier,
      pillState: severityToPillState(hit.severity, hit.status),
      violationId: hit.violationId,
      exemptLabel: null,
    };
  });
}

/** Admin helper: violation queue across all practitioners. RLS
 *  restricts this to admin callers automatically. */
export async function fetchAdminViolationQueue(
  supabase: SupabaseClient,
): Promise<MAPViolationRow[]> {
  const { data } = await asLoose(supabase)
    .from('map_violations')
    .select('*')
    .in('status', ['active', 'notified', 'escalated', 'investigating'])
    .order('severity', { ascending: false })
    .order('grace_period_ends_at', { ascending: true });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    violationId: r.violation_id as string,
    observationId: r.observation_id as string,
    productId: r.product_id as string,
    practitionerId: (r.practitioner_id as string | null) ?? null,
    policyId: r.policy_id as string,
    severity: r.severity as MAPSeverity,
    observedPriceCents: Number(r.observed_price_cents ?? 0),
    mapPriceCents: Number(r.map_price_cents ?? 0),
    discountPctBelowMap: Number(r.discount_pct_below_map ?? 0),
    status: r.status as MAPViolationRow['status'],
    gracePeriodEndsAt: String(r.grace_period_ends_at ?? ''),
    remediationDeadlineAt: String(r.remediation_deadline_at ?? ''),
    notifiedAt: (r.notified_at as string | null) ?? null,
    acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
    remediatedAt: (r.remediated_at as string | null) ?? null,
    escalatedAt: (r.escalated_at as string | null) ?? null,
    dismissedAt: (r.dismissed_at as string | null) ?? null,
    createdAt: String(r.created_at ?? ''),
  }));
}
