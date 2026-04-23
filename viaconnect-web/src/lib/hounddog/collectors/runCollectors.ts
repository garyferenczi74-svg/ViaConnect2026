/**
 * Harness: iterate collectors, call tick() subject to per-collector enabled
 * state and rate-limit state stored in hounddog_collector_state.
 *
 * Today every tick() returns a disabled result; the harness still writes a
 * last_tick_at timestamp so the collectors-health dashboard stays honest.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { collectors } from ".";
import type { CollectorCtx, CollectorResult } from "../bridge-types";

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("runCollectors: missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface RunReport {
  runAt: string;
  perCollector: Array<{
    id: string;
    enabled: boolean;
    errors: CollectorResult["errors"];
    rawSignals: number;
  }>;
}

export async function runCollectors(db?: SupabaseClient): Promise<RunReport> {
  const client = db ?? serviceClient();
  const runAt = new Date().toISOString();
  const perCollector: RunReport["perCollector"] = [];

  // Read enabled state from DB (seeded disabled).
  const { data: states } = await client
    .from("hounddog_collector_state")
    .select("id, enabled");
  const enabledMap = new Map<string, boolean>(
    ((states as Array<{ id: string; enabled: boolean }> | null) ?? []).map((r) => [r.id, r.enabled]),
  );

  for (const [id, collector] of Object.entries(collectors)) {
    const enabled = enabledMap.get(id) ?? false;
    const ctx: CollectorCtx = { enabled };
    let errors: CollectorResult["errors"] = [];
    let rawSignals = 0;
    try {
      const result = await collector.tick(ctx);
      errors = result.errors;
      rawSignals = result.rawSignals.length;
    } catch (err) {
      errors = [{ code: "COLLECTOR_THROW", retryable: false, detail: (err as Error).message }];
    }

    try {
      await client
        .from("hounddog_collector_state")
        .update({ last_tick_at: runAt })
        .eq("id", id);
    } catch {
      // best-effort; don't block the run
    }

    perCollector.push({ id, enabled, errors, rawSignals });
  }

  return { runAt, perCollector };
}
