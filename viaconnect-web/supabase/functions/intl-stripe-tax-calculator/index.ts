// =============================================================================
// intl-stripe-tax-calculator (Prompt #111)
// =============================================================================
// HTTP endpoint invoked at checkout to request a Stripe Tax calculation.
// §3.3: if Stripe Tax is unavailable, this function returns 502 and the
// caller MUST halt checkout. No fallback estimation.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

interface LineItem {
  sku: string;
  amount: number;
  quantity: number;
  tax_code: string;
}
interface ReqBody {
  currency: string;
  customer_address: {
    country: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  line_items: LineItem[];
  shipping_cost_cents?: number;
  shipping_tax_code?: string;
  customer_vat?: { type: "eu_vat" | "gb_vat" | "au_abn"; value: string };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!STRIPE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "STRIPE_SECRET_KEY not configured" }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const form = new URLSearchParams();
  form.set("currency", body.currency.toLowerCase());
  form.set("customer_details[address][country]", body.customer_address.country);
  if (body.customer_address.line1)        form.set("customer_details[address][line1]", body.customer_address.line1);
  if (body.customer_address.line2)        form.set("customer_details[address][line2]", body.customer_address.line2);
  if (body.customer_address.city)         form.set("customer_details[address][city]", body.customer_address.city);
  if (body.customer_address.state)        form.set("customer_details[address][state]", body.customer_address.state);
  if (body.customer_address.postal_code)  form.set("customer_details[address][postal_code]", body.customer_address.postal_code);
  form.set("customer_details[address_source]", "shipping");
  if (body.customer_vat) {
    form.set("customer_details[tax_ids][0][type]", body.customer_vat.type);
    form.set("customer_details[tax_ids][0][value]", body.customer_vat.value);
  }
  body.line_items.forEach((li, i) => {
    form.set(`line_items[${i}][amount]`, String(li.amount));
    form.set(`line_items[${i}][reference]`, li.sku);
    form.set(`line_items[${i}][quantity]`, String(li.quantity));
    form.set(`line_items[${i}][tax_code]`, li.tax_code);
  });
  if (body.shipping_cost_cents && body.shipping_cost_cents > 0) {
    form.set("shipping_cost[amount]", String(body.shipping_cost_cents));
    form.set("shipping_cost[tax_code]", body.shipping_tax_code ?? "txcd_92010001");
  }

  let resp: Response;
  try {
    resp = await fetch("https://api.stripe.com/v1/tax/calculations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${STRIPE_KEY}`,
        "content-type": "application/x-www-form-urlencoded",
        "stripe-version": "2024-09-30.acacia",
      },
      body: form,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "stripe_fetch_failed", detail: String(e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
  const json = await resp.json();
  if (!resp.ok) {
    return new Response(JSON.stringify({ ok: false, error: "stripe_tax_error", stripe_error: json.error ?? json }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      calculation_id: json.id,
      amount_total: json.amount_total,
      tax_amount_exclusive: json.tax_amount_exclusive,
      tax_amount_inclusive: json.tax_amount_inclusive,
      tax_breakdown: json.tax_breakdown,
    }),
    { headers: { "content-type": "application/json" } },
  );
});
