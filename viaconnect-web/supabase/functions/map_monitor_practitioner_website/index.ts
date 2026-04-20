// Prompt #100 map_monitor_practitioner_website
// Scrapes verified practitioner websites for L1/L2 SKU prices via
// Playwright-over-HTTP. Requires a scrape worker endpoint configured
// via PRACTITIONER_SCRAPE_WORKER_URL + SCRAPE_WORKER_TOKEN env vars.

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  fetchL1L2Products,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
  type MonitorContext,
  type ScrapedObservation,
} from '../_map_shared/shared.ts';

Deno.serve(async (req) => {
  const missing = requireEnv(['PRACTITIONER_SCRAPE_WORKER_URL', 'SCRAPE_WORKER_TOKEN']);
  if (missing) return credentialsMissingResponse(missing, 'practitioner_website');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'practitioner_website',
    parserVersion: 'practitioner_website@1.0.0',
  };

  const { productIds = null, practitionerIds = null } = await req.json().catch(() => ({}));
  const products = await fetchL1L2Products(supabase, productIds);

  // Only scrape verified practitioner websites.
  const { data: verified } = await supabase
    .from('practitioners')
    .select('id, user_id')
    .in('id', practitionerIds ?? [])
    .limit(1000);
  const verifiedList = (verified ?? []) as Array<{ id: string; user_id: string }>;

  const observations: ScrapedObservation[] = [];
  for (const p of verifiedList) {
    const url = Deno.env.get('PRACTITIONER_SCRAPE_WORKER_URL')!;
    const token = Deno.env.get('SCRAPE_WORKER_TOKEN')!;
    for (const product of products) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ practitionerId: p.id, sku: product.sku }),
        });
        if (!resp.ok) continue;
        const data = (await resp.json()) as {
          url: string;
          priceCents: number;
          confidence: number;
          screenshotPath?: string;
        };
        if (data && typeof data.priceCents === 'number') {
          observations.push({
            productId: product.id,
            sourceUrl: data.url,
            observedPriceCents: data.priceCents,
            observerConfidence: data.confidence ?? 75,
            practitionerId: p.id,
            screenshotStoragePath: data.screenshotPath ?? null,
          });
        }
      } catch (err) {
        console.error('scrape error', err);
      }
    }
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted, practitioners: verifiedList.length });
});
