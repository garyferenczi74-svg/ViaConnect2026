// Prompt #101 Workstream A map_monitor_telegram_discord
// Practitioner-declared channels only. Only messages authored by the
// practitioner's verified account IDs create violations; third-party
// messages in community channels are ignored per §3.4 fairness rule.
// Env: TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, ANTHROPIC_API_KEY (for
// chat context classification).

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['ANTHROPIC_API_KEY']);
  if (missing) return credentialsMissingResponse(missing, 'telegram_discord');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'telegram_discord' as const, parserVersion: 'chat_haiku@1.0.0' };

  // Per-source pipeline:
  //   1. Telegram: long-poll getUpdates for declared channel bot.
  //      Discord: Gateway connection for declared guild/channel bot.
  //   2. For each message, capture 5-message surrounding window (see
  //      contextCapture.ts) before attempting price extraction.
  //   3. Claude Haiku intent classifier ("is this a price offer?") +
  //      price extraction in one call.
  //   4. Only attribute to practitioner if message_author_id ∈
  //      practitioner_verified_channels.account_ids (table lands in #102).

  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
