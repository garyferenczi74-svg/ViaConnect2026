// Prompt #101 Workstream A map_monitor_instagram_organic
// Distinct from Phase 1 map_monitor_instagram_shop. Monitors organic
// posts (captions, Reels descriptions) via Instagram Graph API for
// practitioner-connected business accounts. Uses Claude Haiku for
// price extraction from captions.
// Env: INSTAGRAM_GRAPH_ACCESS_TOKEN, META_APP_SECRET, ANTHROPIC_API_KEY.

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['INSTAGRAM_GRAPH_ACCESS_TOKEN', 'ANTHROPIC_API_KEY']);
  if (missing) return credentialsMissingResponse(missing, 'instagram_organic');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'instagram_organic' as const, parserVersion: 'ig_organic_haiku@1.0.0' };

  // Pipeline plan (ships inert until credentials land):
  //   1. List connected practitioner business accounts (table TBD).
  //   2. Pull recent captions via /me/media.
  //   3. Face detection pass — skip posts with identifiable individuals.
  //   4. Claude Haiku caption extraction — structured JSON with price
  //      + confidence.
  //   5. Observations persist with practitioner_confidence filled in.

  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
