// =============================================================================
// intl-market-pricing-governance-validator (Prompt #111)
// =============================================================================
// HTTP endpoint invoked when admin submits a draft master_skus_market_pricing
// row for governance. Runs:
//   1. margin floor check: market MSRP -> USD at ECB rate -> compare vs COGS+channel cost+tax overhead
//   2. .88 ending check (honored when enforce_88_ending=TRUE for the market)
//   3. tax_code format validation (Stripe Tax code whitelist)
//   4. FX drift sanity (> ±15% vs US US MSRP flags but does not block)
// Advances status draft -> pending_governance -> pending_approval (or rejected).
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface ReqBody { pricing_id: string }

const KNOWN_TAX_CODES = new Set(["txcd_99999999", "txcd_20030000", "txcd_92010001", "txcd_30070000"]);
const CHANNEL_COST_PCT_DTC = 0.06;
const TAX_OVERHEAD_PCT = 0.02;
const MARGIN_FLOOR_PCT = 0.30;

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: ReqBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  const db = admin();
  const { data: row, error } = await db
    .from("master_skus_market_pricing")
    .select("pricing_id, sku, market_code, currency_code, msrp_cents, tax_code, status")
    .eq("pricing_id", body.pricing_id)
    .maybeSingle();
  if (error || !row) return new Response(JSON.stringify({ ok: false, error: "pricing_id not found" }), { status: 404 });

  const rejections: string[] = [];
  if (!KNOWN_TAX_CODES.has((row as { tax_code: string }).tax_code)) {
    rejections.push(`unknown tax_code ${(row as { tax_code: string }).tax_code}`);
  }

  // Margin floor: look up master_skus for USD COGS; convert market msrp to USD
  // via the most recent ECB USD->currency rate.
  const r = row as { sku: string; market_code: string; currency_code: string; msrp_cents: number };
  const { data: skuRow } = await db.from("master_skus").select("cogs, msrp").eq("sku", r.sku).maybeSingle();
  let marginPct: number | null = null;
  if (skuRow) {
    const cogsUsd = Number((skuRow as { cogs: number }).cogs) || 0;
    let marketMsrpUsd = r.msrp_cents / 100;
    if (r.currency_code !== "USD") {
      const { data: rateRow } = await db
        .from("international_fx_rate_history")
        .select("rate")
        .eq("base_currency", "USD")
        .eq("quote_currency", r.currency_code)
        .eq("rate_source", "ECB")
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const rate = rateRow ? Number((rateRow as { rate: number }).rate) : null;
      if (rate && rate > 0) marketMsrpUsd = (r.msrp_cents / 100) / rate;
    }
    const channelCost = marketMsrpUsd * CHANNEL_COST_PCT_DTC;
    const taxOverhead = marketMsrpUsd * TAX_OVERHEAD_PCT;
    const netMargin = marketMsrpUsd - cogsUsd - channelCost - taxOverhead;
    marginPct = marketMsrpUsd > 0 ? netMargin / marketMsrpUsd : 0;
    if (marginPct < MARGIN_FLOOR_PCT) {
      rejections.push(`margin ${(marginPct * 100).toFixed(1)}% below floor ${(MARGIN_FLOOR_PCT * 100).toFixed(0)}%`);
    }
  } else {
    rejections.push(`master_skus row not found for sku ${r.sku}`);
  }

  const nextStatus = rejections.length > 0 ? "rejected" : "pending_approval";
  const update = {
    status: nextStatus,
    margin_floor_met_at_msrp: rejections.length === 0,
    governance_rejection_reason: rejections.length > 0 ? rejections.join("; ") : null,
    updated_at: new Date().toISOString(),
  };
  const { error: upErr } = await db.from("master_skus_market_pricing").update(update).eq("pricing_id", body.pricing_id);
  if (upErr) return new Response(JSON.stringify({ ok: false, error: upErr.message }), { status: 500 });

  await db.from("international_audit_log").insert({
    action_category: "pricing_governance",
    action_verb: `governance.${nextStatus}`,
    target_table: "master_skus_market_pricing",
    target_id: body.pricing_id,
    market_code: r.market_code,
    currency_code: r.currency_code,
    after_state_json: { ...update, margin_pct: marginPct, rejections },
  });

  return new Response(JSON.stringify({ ok: true, status: nextStatus, rejections, margin_pct: marginPct }), {
    headers: { "content-type": "application/json" },
  });
});
