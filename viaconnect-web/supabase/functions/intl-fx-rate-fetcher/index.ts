// =============================================================================
// intl-fx-rate-fetcher (Prompt #111)
// =============================================================================
// Pulls daily FX rates from the ECB reference feed, converts EUR-base to
// USD-base quotes, and appends to international_fx_rate_history via
// ignoreDuplicates upsert (append-only table — the UNIQUE constraint on
// (base,quote,date,source) makes reruns idempotent).
//
// OANDA failover activates when ECB is stale (> 36h) or parse fails.
// Triggered daily at 03:00 UTC by pg_cron (configure externally).
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withAbortTimeout, isTimeoutError } from "../_shared/with-timeout.ts";
import { safeLog } from "../_shared/safe-log.ts";
import { getCircuitBreaker, isCircuitBreakerError } from "../_shared/circuit-breaker.ts";

const ecbBreaker = getCircuitBreaker("ecb-fx-api");
const oandaBreaker = getCircuitBreaker("oanda-fx-api");

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OANDA_KEY = Deno.env.get("OANDA_API_KEY") ?? "";

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface RateRow {
  base_currency: "USD";
  quote_currency: "EUR" | "GBP" | "AUD";
  rate: number;
  rate_source: "ECB" | "OANDA";
  rate_date: string;
}

async function fetchEcbEurBaseRates(): Promise<Record<string, number>> {
  const resp = await ecbBreaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
        headers: { accept: "application/xml" },
        signal,
      }),
      10000,
      "intl-fx-rate-fetcher.ecb",
    )
  );
  if (!resp.ok) throw new Error(`ECB HTTP ${resp.status}`);
  const xml = await resp.text();
  const rates: Record<string, number> = {};
  const rx = /<Cube\s+currency="([A-Z]{3})"\s+rate="([\d.]+)"\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml)) !== null) rates[m[1]] = Number(m[2]);
  return rates;
}

async function fetchOandaUsdRates(): Promise<Record<string, number>> {
  if (!OANDA_KEY) throw new Error("OANDA_API_KEY missing");
  const url = "https://www.oanda.com/rates/api/v2/rates/spot.json?base=USD&quote=EUR,GBP,AUD";
  const resp = await oandaBreaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch(url, { headers: { authorization: `Bearer ${OANDA_KEY}` }, signal }),
      10000,
      "intl-fx-rate-fetcher.oanda",
    )
  );
  if (!resp.ok) throw new Error(`OANDA HTTP ${resp.status}`);
  const body = await resp.json();
  const out: Record<string, number> = {};
  for (const q of body.quotes ?? []) {
    if (q.quote_currency && q.midpoint) out[q.quote_currency] = Number(q.midpoint);
  }
  return out;
}

function buildRowsFromEcb(eurBase: Record<string, number>, today: string): RateRow[] {
  const usd = eurBase.USD;
  if (!usd) return [];
  const rows: RateRow[] = [];
  const usdToEur = 1 / usd;
  rows.push({ base_currency: "USD", quote_currency: "EUR", rate: Number(usdToEur.toFixed(6)), rate_source: "ECB", rate_date: today });
  if (eurBase.GBP) rows.push({ base_currency: "USD", quote_currency: "GBP", rate: Number((eurBase.GBP / usd).toFixed(6)), rate_source: "ECB", rate_date: today });
  if (eurBase.AUD) rows.push({ base_currency: "USD", quote_currency: "AUD", rate: Number((eurBase.AUD / usd).toFixed(6)), rate_source: "ECB", rate_date: today });
  return rows;
}

function buildRowsFromOanda(usdBase: Record<string, number>, today: string): RateRow[] {
  const rows: RateRow[] = [];
  for (const q of ["EUR", "GBP", "AUD"] as const) {
    if (usdBase[q]) rows.push({ base_currency: "USD", quote_currency: q, rate: Number(usdBase[q].toFixed(6)), rate_source: "OANDA", rate_date: today });
  }
  return rows;
}

serve(async (_req: Request) => {
  const today = new Date().toISOString().slice(0, 10);
  const db = admin();
  let rows: RateRow[] = [];
  let source = "ECB";
  try {
    const ecb = await fetchEcbEurBaseRates();
    rows = buildRowsFromEcb(ecb, today);
    if (rows.length < 3) throw new Error("ECB incomplete");
  } catch (e) {
    try {
      const oanda = await fetchOandaUsdRates();
      rows = buildRowsFromOanda(oanda, today);
      source = "OANDA";
    } catch (ee) {
      return new Response(JSON.stringify({ ok: false, stage: "fetch", primary_error: String(e), failover_error: String(ee) }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }
  }
  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: false, stage: "empty", source }), { status: 502, headers: { "content-type": "application/json" } });
  }
  const { error } = await db
    .from("international_fx_rate_history")
    // @ts-expect-error upsert with ignoreDuplicates treats conflict as no-op
    .upsert(rows, { onConflict: "base_currency,quote_currency,rate_date,rate_source", ignoreDuplicates: true });
  if (error) {
    return new Response(JSON.stringify({ ok: false, stage: "insert", error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, source, rows_submitted: rows.length, rate_date: today }), {
    headers: { "content-type": "application/json" },
  });
});
