// Prompt #106 §5 — three-way reconciliation run.
//
// Fetches master_skus (read-only), pricing_tiers (read-only), product_catalog,
// genex360_products.genex360_sku (for exclusion), peptide_registry.peptide_sku
// (for exclusion). Runs the pure threeWayDiff (mirrored inline here because
// Deno cannot import Node TS). Inserts findings into
// shop_refresh_reconciliation_findings under a single reconciliation_run_id.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, corsPreflight, isAdmin, jsonResponse, resolveShopActor,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

// SOURCE OF TRUTH: src/lib/shopRefresh/reconciliation/categoryNormalizer.ts
const NORMALIZE: Record<string, string> = {
  'BASE FORMULATIONS': 'base-formulations',
  'ADVANCED FORMULATIONS': 'advanced-formulations',
  "WOMEN'S HEALTH": 'womens-health',
  "CHILDREN'S MULTIVITAMINS": 'sproutables-childrens',
  'GENITC SNP METHYLATION SUPPORT': 'snp-support-formulations',
  'GENETIC SNP METHYLATION SUPPORT': 'snp-support-formulations',
  'FUNCTIONAL MUSHROOMS': 'functional-mushrooms',
  ADVANCED: 'advanced-formulations',
  BASE: 'base-formulations',
  WOMEN: 'womens-health',
  CHILDREN: 'sproutables-childrens',
  SNP: 'snp-support-formulations',
  MUSHROOM: 'functional-mushrooms',
};
const OUT_OF_SCOPE = new Set(['TESTING','GENEX360','PEPTIDES','PEPTIDE','GENETIC','TEST_KIT','TEST KIT']);
const IN_SCOPE_MASTER_CATS = new Set(Object.keys(NORMALIZE));

function key(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}
function normalizeSlug(raw: string): string | null {
  return NORMALIZE[key(raw)] ?? null;
}
function isOutOfScopeRaw(raw: string): boolean {
  return OUT_OF_SCOPE.has(key(raw));
}
function priceEq(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE', role: actor.role }, 403);

  const admin = adminClient() as any;
  const runId = crypto.randomUUID();

  const { data: masterSkus } = await admin
    .from('master_skus')
    .select('sku, name, category, msrp');
  const { data: pricingTiers } = await admin
    .from('pricing_tiers')
    .select('sku, msrp');
  const { data: catalog } = await admin
    .from('product_catalog')
    .select('sku, name, category, price, image_url, active');
  const { data: genex } = await admin
    .from('genex360_products')
    .select('genex360_sku');
  const { data: peptides } = await admin
    .from('peptide_registry')
    .select('peptide_sku');

  const canonical = (masterSkus ?? []).filter((r: any) => IN_SCOPE_MASTER_CATS.has(key(r.category)));
  const pricingBySku: Record<string, number> = {};
  for (const p of (pricingTiers ?? []) as any[]) pricingBySku[p.sku] = Number(p.msrp);

  const genexSkus = new Set<string>((genex ?? []).map((r: any) => r.genex360_sku).filter(Boolean));
  const peptideSkus = new Set<string>((peptides ?? []).map((r: any) => r.peptide_sku).filter(Boolean));

  const canonicalBySku = new Map<string, any>();
  for (const c of canonical) canonicalBySku.set(c.sku, c);
  const catalogBySku = new Map<string, any>();
  for (const cat of catalog ?? []) catalogBySku.set((cat as any).sku, cat);

  const findings: Array<{
    finding_type: string;
    sku: string;
    canonical_payload_json: unknown;
    catalog_payload_json: unknown;
  }> = [];

  for (const c of canonical) {
    if (!catalogBySku.has(c.sku)) {
      findings.push({
        finding_type: 'missing_in_catalog',
        sku: c.sku,
        canonical_payload_json: c,
        catalog_payload_json: null,
      });
    }
  }

  for (const cat of (catalog ?? []) as any[]) {
    if (genexSkus.has(cat.sku)) continue;
    if (peptideSkus.has(cat.sku)) continue;
    if (isOutOfScopeRaw(cat.category)) continue;
    if (!canonicalBySku.has(cat.sku)) {
      findings.push({
        finding_type: 'catalog_not_in_canonical',
        sku: cat.sku,
        canonical_payload_json: null,
        catalog_payload_json: cat,
      });
    }
  }

  for (const c of canonical) {
    const cat = catalogBySku.get(c.sku);
    if (!cat) continue;
    if (c.name !== cat.name) {
      findings.push({
        finding_type: 'mismatched_name', sku: c.sku,
        canonical_payload_json: c, catalog_payload_json: cat,
      });
    }
    const cSlug = normalizeSlug(c.category);
    const catSlug = normalizeSlug(cat.category);
    if (cSlug !== null && (catSlug === null || cSlug !== catSlug)) {
      findings.push({
        finding_type: 'mismatched_category', sku: c.sku,
        canonical_payload_json: c, catalog_payload_json: cat,
      });
    }
    const tierPrice = pricingBySku[c.sku] ?? Number(c.msrp);
    if (!priceEq(tierPrice, Number(cat.price))) {
      findings.push({
        finding_type: 'mismatched_price', sku: c.sku,
        canonical_payload_json: { ...c, pricing_tier_msrp: tierPrice },
        catalog_payload_json: cat,
      });
    }
  }

  // Insert findings in one batch.
  if (findings.length > 0) {
    const rows = findings.map((f) => ({
      reconciliation_run_id: runId,
      ...f,
      resolution_status: 'pending_review',
    }));
    const { error: insErr } = await admin.from('shop_refresh_reconciliation_findings').insert(rows);
    if (insErr) return jsonResponse({ error: insErr.message, run_id: runId }, 500);
  }

  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'category_normalization',
    action_verb: 'reconciliation_run.completed',
    target_table: 'shop_refresh_reconciliation_findings',
    actor_user_id: actor.userId,
    actor_role: actor.role,
    context_json: {
      run_id: runId,
      canonical_count: canonical.length,
      catalog_count: (catalog ?? []).length,
      genex_excluded: genexSkus.size,
      peptide_excluded: peptideSkus.size,
      findings_count: findings.length,
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    run_id: runId,
    findings_count: findings.length,
    counts_by_type: findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.finding_type] = (acc[f.finding_type] ?? 0) + 1;
      return acc;
    }, {}),
    canonical_count: canonical.length,
    catalog_count: (catalog ?? []).length,
    genex_excluded: genexSkus.size,
    peptide_excluded: peptideSkus.size,
  });
});
