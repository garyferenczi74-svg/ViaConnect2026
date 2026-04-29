// Prompt #100 map_monitor_amazon
// Polls Amazon Product Advertising API 5.0 for L1/L2 SKUs via the
// verified practitioners' seller IDs. Env: AMAZON_PAAPI_ACCESS_KEY,
// AMAZON_PAAPI_SECRET_KEY, AMAZON_PAAPI_PARTNER_TAG.

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
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv([
    'AMAZON_PAAPI_ACCESS_KEY',
    'AMAZON_PAAPI_SECRET_KEY',
    'AMAZON_PAAPI_PARTNER_TAG',
  ]);
  if (missing) return credentialsMissingResponse(missing, 'amazon');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'amazon',
    parserVersion: 'amazon_paapi_5@1.0.0',
  };

  const products = await fetchL1L2Products(supabase);
  const observations: ScrapedObservation[] = [];

  // Placeholder: production call hits PAAPI GetItems / SearchItems per
  // practitioner's verified Amazon seller ID. Observations are then
  // attributed via the seller_id → practitioner_id map stored in
  // practitioner_verified_channels (table to ship with Prompt #101).
  for (const _product of products) {
    // Real PAAPI invocation omitted until credentials land in Vault.
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted });
});
