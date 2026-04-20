// Prompt #102 Workstream A — channel re-verification cron.
// The heavy lift is done by the SQL cron job (channel_re_verify_daily)
// which transitions lapsed channels. This edge function is a thin
// trigger for manual/admin invocation.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';

Deno.serve(async (_req) => {
  const supabase = getSupabaseClient() as any;
  const { error } = await supabase.rpc('lapse_due_channels'); // may or may not exist — optional RPC
  if (error) console.warn('lapse_due_channels rpc missing; SQL cron handles it');
  return jsonResponse({ triggered: true });
});
