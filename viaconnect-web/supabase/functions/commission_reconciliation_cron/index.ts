// Prompt #102 Workstream B — reconciliation cron HTTP trigger.
// Thin wrapper: the real work is in public.process_reconciliation_for_period.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const periodStart = (body.periodStart as string) ?? yesterday.toISOString().slice(0, 10);
  const periodEnd = (body.periodEnd as string) ?? yesterday.toISOString().slice(0, 10);

  const supabase = getSupabaseClient() as any;
  const { data, error } = await supabase.rpc('process_reconciliation_for_period', {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) return jsonResponse({ error: error.message }, 500);
  const runs = Array.isArray(data) ? data[0]?.runs_written ?? 0 : 0;
  return jsonResponse({ runs_written: runs, period_start: periodStart, period_end: periodEnd });
});
