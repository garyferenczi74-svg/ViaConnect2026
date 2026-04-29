// =============================================================================
// intl-fx-drift-checker (Prompt #111)
// =============================================================================
// For each active master_skus_market_pricing row in a non-US market, computes
// the implied USD equivalent using the most recent USD->market rate and flags
// drift > ±15% vs the US-market MSRP for the same SKU. Flagged rows land in
// international_fx_drift_findings for Domenic's review queue.
// Cron: 03:05 UTC daily (after fx-rate-fetcher).
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isTimeoutError } from "../_shared/with-timeout.ts";
import { safeLog } from "../_shared/safe-log.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DRIFT_THRESHOLD = 0.15;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface Pricing {
  sku: string;
  market_code: "US" | "EU" | "UK" | "AU";
  currency_code: "USD" | "EUR" | "GBP" | "AUD";
  msrp_cents: number;
}

async function latestRate(db: SupabaseClient, quote: string): Promise<number | null> {
  const { data } = await db
    .from("international_fx_rate_history")
    .select("rate")
    .eq("base_currency", "USD")
    .eq("quote_currency", quote)
    .order("rate_date", { ascending: false })
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number((data as { rate: number }).rate) : null;
}

serve(async (_req: Request) => {
  const db = admin();
  const { data: rows, error } = await db
    .from("master_skus_market_pricing")
    .select("sku, market_code, currency_code, msrp_cents")
    .eq("status", "active");
  if (error || !rows) {
    return new Response(JSON.stringify({ ok: false, error: error?.message ?? "no rows" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  const usByMap = new Map<string, number>();
  for (const r of rows as Pricing[]) {
    if (r.market_code === "US") usByMap.set(r.sku, r.msrp_cents);
  }
  const rates: Record<string, number | null> = {
    EUR: await latestRate(db, "EUR"),
    GBP: await latestRate(db, "GBP"),
    AUD: await latestRate(db, "AUD"),
  };

  const findings: Array<Record<string, unknown>> = [];
  for (const r of rows as Pricing[]) {
    if (r.market_code === "US") continue;
    const usCents = usByMap.get(r.sku);
    if (!usCents) continue;
    const rate = rates[r.currency_code];
    if (!rate || rate <= 0) continue;
    const impliedUsdCents = Math.round(r.msrp_cents / rate);
    const driftPct = (impliedUsdCents - usCents) / usCents;
    if (Math.abs(driftPct) > DRIFT_THRESHOLD) {
      findings.push({
        sku: r.sku,
        market_code: r.market_code,
        us_msrp_cents: usCents,
        market_msrp_cents: r.msrp_cents,
        implied_usd_cents: impliedUsdCents,
        drift_pct: Number((driftPct * 100).toFixed(3)),
        status: "open",
      });
    }
  }

  if (findings.length > 0) {
    const { error: insErr } = await db.from("international_fx_drift_findings").insert(findings);
    if (insErr) {
      return new Response(JSON.stringify({ ok: false, stage: "insert", error: insErr.message }), {
        status: 500, headers: { "content-type": "application/json" },
      });
    }
  }
  return new Response(JSON.stringify({ ok: true, rows_scanned: rows.length, findings_raised: findings.length }), {
    headers: { "content-type": "application/json" },
  });
});
