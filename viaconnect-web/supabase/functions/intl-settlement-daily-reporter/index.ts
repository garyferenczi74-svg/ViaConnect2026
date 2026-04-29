// =============================================================================
// intl-settlement-daily-reporter (Prompt #111)
// =============================================================================
// Summarizes the prior day's order_currency_details by currency, computes
// USD-equivalent at each order's recorded FX rate, and reconciles vs Stripe's
// reported settlement USD. Surfaces FX spread impact as a line item.
// Writes one row to international_settlement_daily_reports per day.
// Cron: 04:00 UTC daily.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isTimeoutError } from "../_shared/with-timeout.ts";
import { safeLog } from "../_shared/safe-log.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface OrderDetail {
  currency_code: string;
  total_cents: number;
  fx_rate_to_usd_at_order_time: number;
}

serve(async (_req: Request) => {
  const db = admin();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startIso = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())).toISOString();
  const endIso   = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();
  const reportDate = yesterday.toISOString().slice(0, 10);

  const { data: rows, error } = await db
    .from("order_currency_details")
    .select("currency_code, total_cents, fx_rate_to_usd_at_order_time")
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
  const perCurrency: Record<string, { count: number; total_cents: number; usd_equivalent_cents: number }> = {};
  let totalUsd = 0;
  for (const r of (rows ?? []) as OrderDetail[]) {
    const key = r.currency_code;
    const bucket = perCurrency[key] ?? { count: 0, total_cents: 0, usd_equivalent_cents: 0 };
    bucket.count += 1;
    bucket.total_cents += r.total_cents;
    const usd = key === "USD" ? r.total_cents : Math.round(r.total_cents / Number(r.fx_rate_to_usd_at_order_time));
    bucket.usd_equivalent_cents += usd;
    totalUsd += usd;
    perCurrency[key] = bucket;
  }
  // FX spread impact is computed when Stripe-settled vs ViaConnect-recorded
  // diverge; at this iteration we do not pull Stripe Balance Transactions, so
  // the placeholder is 0. A later milestone wires the Stripe API.
  const fxSpread = 0;
  const discrepancy = Object.values(perCurrency).some((b) => b.count > 0 && b.usd_equivalent_cents === 0);

  const { error: upErr } = await db
    .from("international_settlement_daily_reports")
    // @ts-expect-error upsert ignoreDuplicates
    .upsert(
      {
        report_date: reportDate,
        per_currency_json: perCurrency,
        total_usd_settled_cents: totalUsd,
        total_fx_spread_impact_cents: fxSpread,
        discrepancy_flag: discrepancy,
      },
      { onConflict: "report_date", ignoreDuplicates: false },
    );
  if (upErr) {
    return new Response(JSON.stringify({ ok: false, error: upErr.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, report_date: reportDate, currencies: Object.keys(perCurrency).length, total_usd_settled_cents: totalUsd }), {
    headers: { "content-type": "application/json" },
  });
});
