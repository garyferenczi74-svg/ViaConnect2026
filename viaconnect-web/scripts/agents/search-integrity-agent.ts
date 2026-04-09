// =============================================================================
// search-integrity-agent (Prompt #59)
// =============================================================================
// Local CLI for auditing the supplement search pipeline. Reconciles three
// tables that should be in sync:
//   - supplement_brand_registry         (source of truth for brand identity)
//   - brand_enrichment_state            (per-brand enrichment progress)
//   - supplement_search_index           (the table the CAQ search bar queries)
//
// Usage:
//   npx tsx scripts/agents/search-integrity-agent.ts          # report only
//   npx tsx scripts/agents/search-integrity-agent.ts --fix    # apply fixes
//   npx tsx scripts/agents/search-integrity-agent.ts --trigger # also kick brand-enricher once
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------- env loader (.env.local) -----------------------------------------

function loadEnv() {
  try {
    const txt = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* env file not present — rely on shell env */
  }
}
loadEnv();

const SUPABASE_URL  = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const fix     = process.argv.includes('--fix');
const trigger = process.argv.includes('--trigger');

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- checks ----------------------------------------------------------

interface DriftReport {
  registryCount: number;
  enrichmentStateCount: number;
  orphansInRegistry: Array<{ id: string; brand_name: string }>;
  orphansInEnrichmentState: Array<{ id: string; brand_name: string }>;
  pendingBrands: number;
  seededBrands: number;
  enrichedBrands: number;
  brandsWithZeroProducts: Array<{ brand_name: string; tier: number }>;
  searchIndexTotal: number;
  searchIndexBySource: Record<string, number>;
  productsNotInIndex: number;
  staleSearchIndex: number;
  lastAgentRun: string | null;
}

async function audit(): Promise<DriftReport> {
  const report = {} as DriftReport;

  const { count: regCount } = await db.from('supplement_brand_registry').select('*', { count: 'exact', head: true });
  report.registryCount = regCount ?? 0;

  const { count: stateCount } = await db.from('brand_enrichment_state').select('*', { count: 'exact', head: true });
  report.enrichmentStateCount = stateCount ?? 0;

  // Orphans: in registry but missing enrichment_state
  const { data: regs } = await db.from('supplement_brand_registry').select('id, brand_name');
  const { data: states } = await db.from('brand_enrichment_state').select('brand_id, brand_name');
  const stateIds = new Set((states ?? []).map(s => s.brand_id));
  report.orphansInRegistry = (regs ?? []).filter(r => !stateIds.has(r.id));

  const regIds = new Set((regs ?? []).map(r => r.id));
  report.orphansInEnrichmentState = (states ?? [])
    .filter(s => !regIds.has(s.brand_id))
    .map(s => ({ id: s.brand_id, brand_name: s.brand_name }));

  // Status breakdown
  const { data: status } = await db.from('brand_enrichment_state').select('enrichment_status');
  report.pendingBrands  = (status ?? []).filter(r => r.enrichment_status === 'pending').length;
  report.seededBrands   = (status ?? []).filter(r => r.enrichment_status === 'seeded').length;
  report.enrichedBrands = (status ?? []).filter(r => r.enrichment_status === 'enriched').length;

  // Brands with zero products
  const { data: bcounts } = await db.rpc('audit_brand_product_counts').then(r => r, () => ({ data: null }));
  if (bcounts) {
    report.brandsWithZeroProducts = (bcounts as Array<{ brand_name: string; tier: number; product_count: number }>)
      .filter(b => b.product_count === 0)
      .map(({ brand_name, tier }) => ({ brand_name, tier }));
  } else {
    // Fallback if RPC doesn't exist: do it client-side
    const { data: prods } = await db.from('supplement_brand_top_products').select('brand_registry_id');
    const prodSet = new Set((prods ?? []).map(p => p.brand_registry_id));
    report.brandsWithZeroProducts = (regs ?? [])
      .filter(r => !prodSet.has(r.id))
      .map(r => ({ brand_name: r.brand_name, tier: 0 }));
  }

  // Search index
  const { count: idxCount } = await db.from('supplement_search_index').select('*', { count: 'exact', head: true });
  report.searchIndexTotal = idxCount ?? 0;

  const { data: idxRows } = await db.from('supplement_search_index').select('source');
  report.searchIndexBySource = (idxRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});

  // Drift: products that exist but aren't in the index
  const { data: prodCount } = await db.from('supplement_brand_top_products').select('id');
  const { data: indexedProductIds } = await db
    .from('supplement_search_index')
    .select('source_id')
    .eq('source', 'supplement_brand_top_products');
  const indexedSet = new Set((indexedProductIds ?? []).map(r => r.source_id));
  report.productsNotInIndex = (prodCount ?? []).filter(p => !indexedSet.has(p.id)).length;

  // Stale: index entries pointing at deleted products
  const productIdSet = new Set((prodCount ?? []).map(p => p.id));
  report.staleSearchIndex = (indexedProductIds ?? []).filter(r => !productIdSet.has(r.source_id)).length;

  // Last agent run
  const { data: lastLog } = await db
    .from('brand_agent_log')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  report.lastAgentRun = lastLog?.[0]?.created_at ?? null;

  return report;
}

function printReport(r: DriftReport) {
  const ok = (b: boolean) => (b ? 'OK ' : 'WARN');
  console.log('\n=== Search Integrity Audit ===\n');
  console.log(`Registry brands              : ${r.registryCount}`);
  console.log(`Enrichment state rows        : ${r.enrichmentStateCount}`);
  console.log(`Orphans (in registry only)   : ${ok(r.orphansInRegistry.length === 0)} ${r.orphansInRegistry.length}`);
  if (r.orphansInRegistry.length > 0) {
    for (const o of r.orphansInRegistry) console.log(`  - ${o.brand_name}`);
  }
  console.log(`Orphans (in state only)      : ${ok(r.orphansInEnrichmentState.length === 0)} ${r.orphansInEnrichmentState.length}`);
  console.log('');
  console.log(`Pending brands               : ${r.pendingBrands}`);
  console.log(`Seeded brands                : ${r.seededBrands}`);
  console.log(`Enriched brands              : ${r.enrichedBrands}`);
  console.log(`Brands with 0 products       : ${r.brandsWithZeroProducts.length}`);
  console.log('');
  console.log(`Search index total           : ${r.searchIndexTotal}`);
  for (const [src, cnt] of Object.entries(r.searchIndexBySource)) {
    console.log(`  ${src.padEnd(32)} ${cnt}`);
  }
  console.log(`Products NOT in search index : ${ok(r.productsNotInIndex === 0)} ${r.productsNotInIndex}`);
  console.log(`Stale search index entries   : ${ok(r.staleSearchIndex === 0)} ${r.staleSearchIndex}`);
  console.log('');
  console.log(`Last agent run               : ${r.lastAgentRun ?? 'NEVER'}`);
  console.log('');
}

// ---------- fixers ----------------------------------------------------------

async function applyFixes(r: DriftReport) {
  console.log('Applying fixes...\n');

  // 1. Backfill missing enrichment_state rows
  for (const o of r.orphansInRegistry) {
    const { data: reg } = await db.from('supplement_brand_registry').select('id, brand_name, tier').eq('id', o.id).single();
    if (!reg) continue;
    await db.from('brand_enrichment_state').insert({
      brand_id: reg.id,
      brand_name: reg.brand_name,
      tier: reg.tier,
      enrichment_status: 'pending',
    });
    console.log(`  + enrichment_state for ${reg.brand_name}`);
  }

  // 2. Remove orphaned enrichment_state rows
  for (const o of r.orphansInEnrichmentState) {
    await db.from('brand_enrichment_state').delete().eq('brand_id', o.id);
    console.log(`  - orphaned state for ${o.brand_name}`);
  }

  // 3. Remove stale search index entries
  if (r.staleSearchIndex > 0) {
    const { data: prods } = await db.from('supplement_brand_top_products').select('id');
    const productIds = new Set((prods ?? []).map(p => p.id));
    const { data: idx } = await db.from('supplement_search_index').select('id, source_id').eq('source', 'supplement_brand_top_products');
    const stale = (idx ?? []).filter(r => !productIds.has(r.source_id));
    for (const s of stale) {
      await db.from('supplement_search_index').delete().eq('id', s.id);
    }
    console.log(`  - removed ${stale.length} stale index entries`);
  }

  // 4. Backfill missing index entries
  if (r.productsNotInIndex > 0) {
    const { data: prods } = await db.from('supplement_brand_top_products').select('id, brand_registry_id, product_name, normalized_product_name, product_category');
    const { data: idx } = await db.from('supplement_search_index').select('source_id').eq('source', 'supplement_brand_top_products');
    const indexedSet = new Set((idx ?? []).map(r => r.source_id));
    const { data: regs } = await db.from('supplement_brand_registry').select('id, brand_name');
    const brandMap = new Map((regs ?? []).map(r => [r.id, r.brand_name]));
    const missing = (prods ?? []).filter(p => !indexedSet.has(p.id));
    if (missing.length > 0) {
      await db.from('supplement_search_index').insert(
        missing.map(p => ({
          source: 'supplement_brand_top_products',
          source_id: p.id,
          brand_name: brandMap.get(p.brand_registry_id) ?? '',
          product_name: p.product_name,
          normalized_product_name: p.normalized_product_name,
          product_category: p.product_category,
          is_active: true,
        }))
      );
      console.log(`  + backfilled ${missing.length} missing index entries`);
    }
  }
}

async function triggerEnricher() {
  console.log('Triggering brand-enricher Edge Function...');
  const r = await fetch(`${SUPABASE_URL}/functions/v1/brand-enricher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const txt = await r.text();
  console.log(`HTTP ${r.status}: ${txt.slice(0, 500)}`);
}

// ---------- main ------------------------------------------------------------

(async () => {
  const report = await audit();
  printReport(report);
  if (fix) await applyFixes(report);
  if (trigger) await triggerEnricher();
})().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
