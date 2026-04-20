// Prompt #101 Workstream A map_monitor_reddit
// Reddit API. Env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
// REDDIT_USER_AGENT, ANTHROPIC_API_KEY (Haiku for context extraction).

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'reddit');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'reddit' as const, parserVersion: 'reddit_api@1.0.0' };

  // Per-subreddit monitoring of r/Supplements, r/Nootropics, r/Peptides,
  // r/Biohackers, + practitioner-declared community subs. Only attributed
  // accounts (practitioner_verified_channels) create violations; everyone
  // else enters the investigation queue.

  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
