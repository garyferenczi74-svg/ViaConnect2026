// =============================================================================
// intl-refund-orchestrator (Prompt #111)
// =============================================================================
// HTTP endpoint for admin-triggered currency-matched refunds. Stripe refund
// is always issued in the ORIGINAL purchase currency. USD-equivalent captured
// at refund time using the most recent ECB USD->currency rate.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withAbortTimeout, isTimeoutError } from "../_shared/with-timeout.ts";
import { safeLog } from "../_shared/safe-log.ts";
import { getCircuitBreaker, isCircuitBreakerError } from "../_shared/circuit-breaker.ts";

const stripeBreaker = getCircuitBreaker("stripe-api");

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface ReqBody {
  order_id: string;
  refund_amount_cents: number;
  refund_reason?: string;
  actor_user_id: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!STRIPE_KEY) return new Response(JSON.stringify({ ok: false, error: "STRIPE_SECRET_KEY not configured" }), { status: 502 });
  let body: ReqBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  const db = admin();

  const { data: ocd, error } = await db
    .from("order_currency_details")
    .select("detail_id, currency_code, stripe_payment_intent_id, total_cents")
    .eq("order_id", body.order_id)
    .maybeSingle();
  if (error || !ocd) return new Response(JSON.stringify({ ok: false, error: "order_currency_details not found" }), { status: 404 });
  const o = ocd as { detail_id: string; currency_code: string; stripe_payment_intent_id: string | null; total_cents: number };
  if (!o.stripe_payment_intent_id) return new Response(JSON.stringify({ ok: false, error: "no stripe_payment_intent_id on order" }), { status: 409 });
  if (body.refund_amount_cents > o.total_cents) return new Response(JSON.stringify({ ok: false, error: "refund exceeds order total" }), { status: 400 });

  const form = new URLSearchParams();
  form.set("payment_intent", o.stripe_payment_intent_id);
  form.set("amount", String(body.refund_amount_cents));
  form.set("reason", "requested_by_customer");
  form.set("metadata[order_id]", body.order_id);
  form.set("metadata[prompt_111]", "currency_matched");
  form.set("metadata[original_currency]", o.currency_code);

  const r = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      authorization: `Bearer ${STRIPE_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2024-09-30.acacia",
    },
    body: form,
  });
  const stripeJson = await r.json();
  if (!r.ok) return new Response(JSON.stringify({ ok: false, error: "stripe_refund_failed", stripe_error: stripeJson.error ?? stripeJson }), { status: 502 });

  // FX rate at refund (USD->currency). USD is 1.
  let fxRate = 1;
  if (o.currency_code !== "USD") {
    const { data: rateRow } = await db
      .from("international_fx_rate_history")
      .select("rate").eq("base_currency", "USD").eq("quote_currency", o.currency_code)
      .order("rate_date", { ascending: false }).limit(1).maybeSingle();
    fxRate = rateRow ? Number((rateRow as { rate: number }).rate) : 1;
  }
  const usdEq = o.currency_code === "USD" ? body.refund_amount_cents : Math.round(body.refund_amount_cents / fxRate);

  const { data: ins, error: insErr } = await db
    .from("international_refunds")
    .insert({
      order_id: body.order_id,
      original_purchase_currency: o.currency_code,
      refund_amount_cents: body.refund_amount_cents,
      stripe_refund_id: stripeJson.id,
      usd_equivalent_cents_at_refund: usdEq,
      fx_rate_at_refund: fxRate,
      refund_reason: body.refund_reason ?? null,
      refunded_by_user_id: body.actor_user_id,
      status: stripeJson.status === "succeeded" ? "completed" : "processing",
    })
    .select("refund_id")
    .single();
  if (insErr) return new Response(JSON.stringify({ ok: false, error: insErr.message }), { status: 500 });

  await db.from("international_audit_log").insert({
    actor_user_id: body.actor_user_id,
    action_category: "refund",
    action_verb: "refund.processed",
    target_table: "international_refunds",
    target_id: (ins as { refund_id: string }).refund_id,
    currency_code: o.currency_code,
    after_state_json: { order_id: body.order_id, stripe_refund_id: stripeJson.id, amount_cents: body.refund_amount_cents, currency: o.currency_code },
  });
  return new Response(JSON.stringify({ ok: true, refund_id: (ins as { refund_id: string }).refund_id, stripe_refund_id: stripeJson.id }), {
    headers: { "content-type": "application/json" },
  });
});
