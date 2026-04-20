// Prompt #100 MAP Enforcement — shared helpers for monitor edge functions.
//
// Every map_monitor_<source> function follows the same contract:
//   1. Validate required env credentials; skip cleanly if missing.
//   2. Scrape prices from the source for L1/L2 SKUs only.
//   3. Insert observations into map_price_observations.
//   4. Trigger public.detect_map_violations() immediately.
//
// The shared module encapsulates steps 1, 3, 4 so per-source code
// only owns the scrape.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ScrapedObservation {
  productId: string;
  sourceUrl: string;
  observedPriceCents: number;
  observerConfidence: number;
  practitionerId: string | null;
  screenshotStoragePath?: string | null;
  rawHtmlStoragePath?: string | null;
}

export interface MonitorContext {
  supabase: SupabaseClient;
  source:
    | 'practitioner_website'
    | 'amazon'
    | 'instagram_shop'
    | 'shopify'
    | 'google_shopping'
    | 'ebay';
  parserVersion: string;
}

export function requireEnv(keys: string[]): string | null {
  for (const key of keys) {
    if (!Deno.env.get(key)) return key;
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

export async function fetchL1L2Products(
  supabase: SupabaseClient,
  productIds?: string[] | null,
): Promise<Array<{ id: string; sku: string; name: string }>> {
  let q = supabase.from('products').select('id, sku, name').in('pricing_tier', ['L1', 'L2']);
  if (productIds && productIds.length > 0) q = q.in('id', productIds);
  const { data, error } = await q;
  if (error) throw new Error(`fetchL1L2Products: ${error.message}`);
  return (data ?? []) as Array<{ id: string; sku: string; name: string }>;
}

export async function persistObservations(
  ctx: MonitorContext,
  observations: ScrapedObservation[],
): Promise<number> {
  if (observations.length === 0) return 0;
  const rows = observations.map((o) => ({
    product_id: o.productId,
    source: ctx.source,
    source_url: o.sourceUrl,
    practitioner_id: o.practitionerId,
    observed_price_cents: o.observedPriceCents,
    observer_confidence: o.observerConfidence,
    screenshot_storage_path: o.screenshotStoragePath ?? null,
    raw_html_storage_path: o.rawHtmlStoragePath ?? null,
    parser_version: ctx.parserVersion,
  }));
  const { error } = await ctx.supabase.from('map_price_observations').insert(rows);
  if (error) throw new Error(`persistObservations: ${error.message}`);
  const { error: rpcError } = await ctx.supabase.rpc('detect_map_violations');
  if (rpcError) console.error('detect_map_violations rpc', rpcError.message);
  return rows.length;
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Returns a skip response when credentials are missing so the cron
 *  call succeeds (no noisy alerts) even before API keys are provisioned. */
export function credentialsMissingResponse(missingKey: string, source: string): Response {
  console.warn(`[${source}] Missing credential: ${missingKey}. Skipping scrape.`);
  return jsonResponse({ skipped: true, reason: 'credentials_missing', missing_key: missingKey });
}
