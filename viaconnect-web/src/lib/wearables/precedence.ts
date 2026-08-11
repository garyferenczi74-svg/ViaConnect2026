// Prompt 212: per-metric source precedence reads.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  DEFAULT_PRECEDENCE,
  type MetricKey,
  type WearableProvider,
} from "./types";

const SCOPE = "lib.wearables.precedence";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export async function getPreferredProvider(
  db: Db,
  userId: string,
  metricKey: MetricKey,
): Promise<WearableProvider> {
  try {
    const { data } = await withTimeout(
      (db as any)
        .from("wearable_metric_precedence")
        .select("preferred_provider")
        .eq("user_id", userId)
        .eq("metric_key", metricKey)
        .maybeSingle(),
      3000,
      `${SCOPE}.get`,
    );
    if (data?.preferred_provider) return data.preferred_provider as WearableProvider;
  } catch (err) {
    safeLog.warn(SCOPE, "read failed, using default", { error: err, metricKey });
  }
  return DEFAULT_PRECEDENCE[metricKey];
}

/**
 * Select preferred provider row; fall back to other sources only when preferred
 * has no data for the window. Never averages.
 */
export function pickByPrecedence<T extends { source_provider: string }>(
  rows: T[],
  preferred: WearableProvider,
): T | null {
  if (!rows.length) return null;
  const pref = rows.find((r) => r.source_provider === preferred);
  if (pref) return pref;
  return rows[0] ?? null;
}

export async function seedDefaultPrecedence(db: Db, userId: string): Promise<void> {
  try {
    const rows = Object.entries(DEFAULT_PRECEDENCE).map(([metric_key, preferred_provider]) => ({
      user_id: userId,
      metric_key,
      preferred_provider,
      updated_at: new Date().toISOString(),
    }));
    await withTimeout(
      (db as any)
        .from("wearable_metric_precedence")
        .upsert(rows, { onConflict: "user_id,metric_key", ignoreDuplicates: true }),
      4000,
      `${SCOPE}.seed`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, "seed failed", { error: err });
  }
}
