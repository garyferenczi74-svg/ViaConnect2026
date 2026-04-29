// =============================================================================
// brand-enricher Edge Function (Prompt #59)
// =============================================================================
// 4-source cascading waterfall for supplement product enrichment:
//   1. DSLD (NIH Dietary Supplement Label Database) — ingredients, serving_size
//   2. OpenFoodFacts                                 — ingredients, image, barcode
//   3. bright-api (Bright Data / Amazon)             — price, image, ASIN  [ALWAYS]
//   4. Anthropic Claude w/ web_search                — fallback for missing fields
//
// Pulls a batch of brands from brand_enrichment_state where status IN
// ('pending','seeded'), runs the waterfall, writes products, logs to
// brand_agent_log, refreshes the search index for touched brands.
//
// Triggered every 10 min by pg_cron via pg_net.http_post (see migration
// 20260408000002_enrichment_cron.sql).
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout, withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const claudeBreaker = getCircuitBreaker('claude-api');

// ---------- types -----------------------------------------------------------

interface BrandRow {
  brand_id: string;
  brand_name: string;
  tier: number;
  enrichment_status: string;
}

interface EnrichedProduct {
  product_name: string;
  product_category: string | null;
  serving_size: string | null;
  ingredient_breakdown: unknown[] | null;
  retail_price_usd: number | null;
  image_url: string | null;
  product_url: string | null;
  barcode_upc: string | null;
  enrichment_source: string;       // comma-joined sources actually used
  enrichment_confidence: number;   // 0..1, weighted by how many sources hit
}

interface ConfigMap {
  agent_enabled: boolean;
  batch_size: number;
  api_calls_per_run: number;
  enrichment_target_score: number;
  priority_tier_order: number[];
  retry_limit: number;
}

// ---------- env -------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ---------- helpers ---------------------------------------------------------

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

async function loadConfig(db: SupabaseClient): Promise<ConfigMap> {
  const { data, error } = await db.from('brand_agent_config').select('key,value');
  if (error) throw new Error(`config load failed: ${error.message}`);
  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
  return {
    agent_enabled:           map.agent_enabled === 'true',
    batch_size:              parseInt(map.batch_size ?? '5', 10),
    api_calls_per_run:       parseInt(map.api_calls_per_run ?? '20', 10),
    enrichment_target_score: parseFloat(map.enrichment_target_score ?? '0.8'),
    priority_tier_order:     (map.priority_tier_order ?? '1,5,2,4,3').split(',').map((n: string) => parseInt(n, 10)),
    retry_limit:             parseInt(map.retry_limit ?? '3', 10),
  };
}

async function pickBatch(db: SupabaseClient, cfg: ConfigMap): Promise<BrandRow[]> {
  // Order by configured priority_tier_order using a CASE expression, then by retry_count asc
  // Easier path: fetch wider set, sort in JS by the configured tier order.
  const { data, error } = await db
    .from('brand_enrichment_state')
    .select('brand_id, brand_name, tier, enrichment_status, retry_count')
    .in('enrichment_status', ['pending', 'seeded'])
    .lt('retry_count', cfg.retry_limit)
    .limit(cfg.batch_size * 4);
  if (error) throw new Error(`batch fetch failed: ${error.message}`);
  const rows = (data ?? []) as Array<BrandRow & { retry_count: number }>;
  rows.sort((a, b) => {
    const ai = cfg.priority_tier_order.indexOf(a.tier);
    const bi = cfg.priority_tier_order.indexOf(b.tier);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.retry_count - b.retry_count;
  });
  return rows.slice(0, cfg.batch_size);
}

// ---------- waterfall sources -----------------------------------------------

// 1. DSLD — public NIH search-filter endpoint, returns product hits per brand
async function fetchDSLD(brandName: string): Promise<EnrichedProduct[]> {
  try {
    const url = `https://api.ods.od.nih.gov/dsld/v9/search-filter?q=${encodeURIComponent('"' + brandName + '"')}&size=10`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) return [];
    const j = await r.json() as { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
    const hits = j?.hits?.hits ?? [];
    return hits.map(h => {
      const s = (h._source ?? {}) as Record<string, unknown>;
      return {
        product_name:           String(s.fullName ?? s.brandName ?? ''),
        product_category:       (s.productType as string) ?? null,
        serving_size:           (s.servingSize as string) ?? null,
        ingredient_breakdown:   Array.isArray(s.ingredientRows) ? s.ingredientRows : null,
        retail_price_usd:       null,
        image_url:              null,
        product_url:            (s.thumbnail as string) ?? null,
        barcode_upc:            (s.upcSku as string) ?? null,
        enrichment_source:      'dsld',
        enrichment_confidence:  0.6,
      };
    }).filter(p => p.product_name);
  } catch (e) {
    console.warn(`[dsld] ${brandName}: ${(e as Error).message}`);
    return [];
  }
}

// 2. OpenFoodFacts — search by brand
async function fetchOFF(brandName: string): Promise<EnrichedProduct[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(brandName)}&search_simple=1&action=process&json=1&page_size=10`;
    const r = await fetch(url, { headers: { 'User-Agent': 'ViaConnect/1.0 (FarmCeutica)' } });
    if (!r.ok) return [];
    const j = await r.json() as { products?: Array<Record<string, unknown>> };
    return (j.products ?? []).map(p => ({
      product_name:           String(p.product_name ?? p.product_name_en ?? ''),
      product_category:       (p.categories as string)?.split(',')?.[0] ?? null,
      serving_size:           (p.serving_size as string) ?? null,
      ingredient_breakdown:   p.ingredients ? (p.ingredients as unknown[]) : null,
      retail_price_usd:       null,
      image_url:              (p.image_url as string) ?? (p.image_front_url as string) ?? null,
      product_url:            p.code ? `https://world.openfoodfacts.org/product/${p.code}` : null,
      barcode_upc:            (p.code as string) ?? null,
      enrichment_source:      'openfoodfacts',
      enrichment_confidence:  0.5,
    })).filter(p => p.product_name);
  } catch (e) {
    console.warn(`[off] ${brandName}: ${(e as Error).message}`);
    return [];
  }
}

// 3. bright-api — internal Edge Function (ALWAYS called per directive C)
async function fetchBright(brandName: string): Promise<EnrichedProduct[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/bright-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ action: 'search_brand', brand: brandName, limit: 10 }),
    });
    if (!r.ok) return [];
    const j = await r.json() as { products?: Array<Record<string, unknown>> };
    return (j.products ?? []).map(p => ({
      product_name:           String(p.title ?? p.name ?? ''),
      product_category:       (p.category as string) ?? null,
      serving_size:           (p.serving_size as string) ?? null,
      ingredient_breakdown:   null,
      retail_price_usd:       p.price ? Number(p.price) : null,
      image_url:              (p.image as string) ?? null,
      product_url:            (p.url as string) ?? null,
      barcode_upc:            (p.asin as string) ?? null,
      enrichment_source:      'bright',
      enrichment_confidence:  0.7,
    })).filter(p => p.product_name);
  } catch (e) {
    console.warn(`[bright] ${brandName}: ${(e as Error).message}`);
    return [];
  }
}

// 4. Anthropic Claude — final fallback for missing fields
async function fetchClaude(brandName: string, gaps: { needPrice: boolean; needIngredients: boolean }): Promise<EnrichedProduct[]> {
  if (!ANTHROPIC_KEY) return [];
  try {
    const userMsg = `List the top 5 best-selling supplement products from the brand "${brandName}". For each, return JSON with keys: product_name, product_category, serving_size, ingredient_breakdown (array of {name, amount}), retail_price_usd, product_url. Respond with ONLY a valid JSON array, no commentary.`;
    const r = await claudeBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 2000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: userMsg }],
          }),
          signal,
        }),
        15000,
        'edge-function.brand-enricher.claude-api',
      )
    );
    if (!r.ok) {
      safeLog.warn('brand-enricher.claude', 'non-2xx', { brandName, status: r.status });
      return [];
    }
    const j = await r.json() as { content?: Array<{ type: string; text?: string }> };
    const text = (j.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]) as Array<Record<string, unknown>>;
    return arr.map(p => ({
      product_name:           String(p.product_name ?? ''),
      product_category:       (p.product_category as string) ?? null,
      serving_size:           (p.serving_size as string) ?? null,
      ingredient_breakdown:   Array.isArray(p.ingredient_breakdown) ? p.ingredient_breakdown : null,
      retail_price_usd:       p.retail_price_usd ? Number(p.retail_price_usd) : null,
      image_url:              null,
      product_url:            (p.product_url as string) ?? null,
      barcode_upc:            null,
      enrichment_source:      'claude',
      enrichment_confidence:  0.4,
    })).filter(p => p.product_name);
  } catch (e) {
    if (isCircuitBreakerError(e)) {
      safeLog.warn('brand-enricher.claude', 'circuit open', { brandName, error: e });
    } else if (isTimeoutError(e)) {
      safeLog.warn('brand-enricher.claude', 'timeout', { brandName, error: e });
    } else {
      safeLog.warn('brand-enricher.claude', 'fetch failed', { brandName, error: e });
    }
    return [];
  }
}

// ---------- waterfall merger ------------------------------------------------

function mergeByName(buckets: EnrichedProduct[][]): EnrichedProduct[] {
  // Group by normalized product name across all source buckets, then for each
  // group merge fields preferring sources earlier in the bucket order EXCEPT
  // for price/image where Bright Data is primary (per directive C).
  const byKey = new Map<string, EnrichedProduct>();
  for (const bucket of buckets) {
    for (const p of bucket) {
      const key = normalize(p.product_name);
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...p, enrichment_source: p.enrichment_source });
      } else {
        // Merge — fill nulls, append source, sum confidence (capped at 1.0)
        if (!existing.product_category && p.product_category) existing.product_category = p.product_category;
        if (!existing.serving_size && p.serving_size)         existing.serving_size = p.serving_size;
        if (!existing.ingredient_breakdown && p.ingredient_breakdown) existing.ingredient_breakdown = p.ingredient_breakdown;
        // price: bright wins, otherwise first non-null
        if (p.enrichment_source === 'bright' && p.retail_price_usd != null) existing.retail_price_usd = p.retail_price_usd;
        else if (existing.retail_price_usd == null && p.retail_price_usd != null) existing.retail_price_usd = p.retail_price_usd;
        // image: bright wins, otherwise first non-null
        if (p.enrichment_source === 'bright' && p.image_url) existing.image_url = p.image_url;
        else if (!existing.image_url && p.image_url) existing.image_url = p.image_url;
        if (!existing.product_url && p.product_url) existing.product_url = p.product_url;
        if (!existing.barcode_upc && p.barcode_upc) existing.barcode_upc = p.barcode_upc;
        if (!existing.enrichment_source.includes(p.enrichment_source)) {
          existing.enrichment_source = `${existing.enrichment_source},${p.enrichment_source}`;
        }
        existing.enrichment_confidence = Math.min(1.0, existing.enrichment_confidence + p.enrichment_confidence * 0.5);
      }
    }
  }
  return Array.from(byKey.values());
}

// ---------- per-brand pipeline ----------------------------------------------

async function enrichBrand(db: SupabaseClient, brand: BrandRow, runId: string): Promise<{ added: number; updated: number; error: string | null }> {
  const t0 = Date.now();

  // 1+2 parallel — DSLD + OpenFoodFacts (both free, no rate concern)
  const [dsld, off] = await Promise.all([fetchDSLD(brand.brand_name), fetchOFF(brand.brand_name)]);

  // 3 — bright-api ALWAYS called per directive C
  const bright = await fetchBright(brand.brand_name);

  // 4 — Claude fallback only if we have gaps after the first 3
  const interim = mergeByName([dsld, off, bright]);
  const needPrice       = interim.some(p => p.retail_price_usd == null);
  const needIngredients = interim.some(p => !p.ingredient_breakdown);
  let claude: EnrichedProduct[] = [];
  if (interim.length === 0 || needPrice || needIngredients) {
    claude = await fetchClaude(brand.brand_name, { needPrice, needIngredients });
  }

  const merged = mergeByName([dsld, off, bright, claude]);
  if (merged.length === 0) {
    await db.from('brand_agent_log').insert({
      run_id: runId,
      brand_id: brand.brand_id,
      brand_name: brand.brand_name,
      tier: brand.tier,
      action: 'enrich_no_results',
      products_added: 0,
      products_updated: 0,
      error_message: 'all 4 sources returned empty',
      duration_ms: Date.now() - t0,
    });
    await db.from('brand_enrichment_state').update({
      enrichment_status: 'pending',
      retry_count: db.rpc as unknown as number, // we'll do increment via separate call
      last_attempt_at: new Date().toISOString(),
    }).eq('brand_id', brand.brand_id);
    // Real retry_count increment
    await db.rpc('increment_brand_retry', { p_brand_id: brand.brand_id }).then(() => {}, () => {});
    return { added: 0, updated: 0, error: 'all sources empty' };
  }

  // Upsert each product into supplement_brand_top_products
  let added = 0, updated = 0;
  for (const p of merged) {
    const norm = normalize(p.product_name);
    const { data: existing } = await db
      .from('supplement_brand_top_products')
      .select('id')
      .eq('brand_registry_id', brand.brand_id)
      .eq('normalized_product_name', norm)
      .maybeSingle();

    const row = {
      brand_registry_id:        brand.brand_id,
      product_name:             p.product_name,
      normalized_product_name:  norm,
      product_category:         p.product_category,
      serving_size:             p.serving_size,
      ingredient_breakdown:     p.ingredient_breakdown,
      retail_price_usd:         p.retail_price_usd,
      image_url:                p.image_url,
      product_url:              p.product_url,
      barcode_upc:              p.barcode_upc,
      is_enriched:              true,
      enrichment_status:        'enriched',
      enrichment_confidence:    p.enrichment_confidence,
      enrichment_source:        p.enrichment_source,
      enrichment_date:          new Date().toISOString(),
      discovery_source:         'brand-enricher-agent',
    };

    if (existing) {
      const { error } = await db.from('supplement_brand_top_products').update(row).eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await db.from('supplement_brand_top_products').insert(row);
      if (!error) added++;
    }
  }

  // Compute enrichment_score = mean confidence weighted by coverage
  const score = merged.reduce((s, p) => s + p.enrichment_confidence, 0) / merged.length;

  // Update enrichment_state
  await db.from('brand_enrichment_state').update({
    enrichment_status: score >= 0.8 ? 'enriched' : 'seeded',
    enriched_product_count: merged.length,
    seed_product_count: merged.length,
    enrichment_score: score,
    last_attempt_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
    enrichment_notes: `sources: ${[dsld.length ? 'dsld' : null, off.length ? 'off' : null, bright.length ? 'bright' : null, claude.length ? 'claude' : null].filter(Boolean).join('+')}`,
  }).eq('brand_id', brand.brand_id);

  // Refresh search index for this brand
  await db.from('supplement_search_index')
    .delete()
    .eq('source', 'supplement_brand_top_products')
    .in('source_id', merged.map(() => brand.brand_id));
  // Re-insert from current top_products
  const { data: currentProducts } = await db
    .from('supplement_brand_top_products')
    .select('id, product_name, normalized_product_name, product_category')
    .eq('brand_registry_id', brand.brand_id);
  if (currentProducts && currentProducts.length > 0) {
    await db.from('supplement_search_index').insert(
      currentProducts.map(p => ({
        source: 'supplement_brand_top_products',
        source_id: p.id,
        brand_name: brand.brand_name,
        product_name: p.product_name,
        normalized_product_name: p.normalized_product_name,
        product_category: p.product_category,
        is_active: true,
      }))
    );
  }

  // Log success
  await db.from('brand_agent_log').insert({
    run_id: runId,
    brand_id: brand.brand_id,
    brand_name: brand.brand_name,
    tier: brand.tier,
    action: 'enrich_success',
    products_added: added,
    products_updated: updated,
    duration_ms: Date.now() - t0,
  });

  return { added, updated, error: null };
}

// ---------- entry point -----------------------------------------------------

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const cfg = await loadConfig(db);
    if (!cfg.agent_enabled) {
      return json({ ok: true, skipped: 'agent disabled in config', run_id: runId });
    }
    if (!ANTHROPIC_KEY) {
      console.warn('[brand-enricher] ANTHROPIC_API_KEY not set — Claude fallback disabled. Set via: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...');
    }

    const batch = await pickBatch(db, cfg);
    if (batch.length === 0) {
      // Mark cycle complete
      await db.from('brand_agent_config').update({ value: new Date().toISOString() }).eq('key', 'last_full_cycle_at');
      return json({ ok: true, run_id: runId, processed: 0, message: 'no pending brands' });
    }

    const results = [];
    for (const brand of batch) {
      try {
        const r = await enrichBrand(db, brand, runId);
        results.push({ brand: brand.brand_name, ...r });
      } catch (e) {
        const msg = (e as Error).message;
        results.push({ brand: brand.brand_name, added: 0, updated: 0, error: msg });
        await db.from('brand_agent_log').insert({
          run_id: runId,
          brand_id: brand.brand_id,
          brand_name: brand.brand_name,
          tier: brand.tier,
          action: 'enrich_error',
          products_added: 0,
          products_updated: 0,
          error_message: msg,
        });
      }
    }

    return json({
      ok: true,
      run_id: runId,
      processed: batch.length,
      duration_ms: Date.now() - t0,
      results,
    });
  } catch (e) {
    const msg = (e as Error).message;
    safeLog.error('brand-enricher', 'fatal', { runId, error: e });
    await db.from('brand_agent_log').insert({
      run_id: runId,
      brand_name: '_runner_',
      tier: 0,
      action: 'runner_fatal',
      products_added: 0,
      products_updated: 0,
      error_message: msg,
    });
    return json({ ok: false, error: msg, run_id: runId }, 500);
  }
});
