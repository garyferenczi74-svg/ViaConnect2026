// Prompt #101 Workstream A map_monitor_facebook_marketplace
// Env: META_APP_SECRET, META_MARKETPLACE_ACCESS_TOKEN (when available).

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['META_APP_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'facebook_marketplace');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'facebook_marketplace' as const, parserVersion: 'fb_marketplace@1.0.0' };

  // Stale-listing heuristic is applied in lib/map/phase2/confidenceScoring.ts
  // Observations older than 30 days get a lower confidence score before
  // detect_map_violations() runs.

  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
