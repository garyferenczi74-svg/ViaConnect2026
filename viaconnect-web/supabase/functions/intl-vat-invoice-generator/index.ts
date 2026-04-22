// =============================================================================
// intl-vat-invoice-generator (Prompt #111)
// =============================================================================
// Invoked by a Stripe webhook route in Next.js on payment_intent.succeeded
// for non-US markets. Allocates the jurisdiction-scoped invoice number via
// allocate_vat_invoice_number(), persists the invoice header row (without
// PDF artifact — PDF rendering lives in src/lib/international/vat-invoice.ts
// using pdf-lib), and lets the caller upload the rendered PDF separately.
//
// This edge function exists mainly to centralize sequence allocation +
// idempotent header creation when the Next.js API route prefers a server-
// side trigger path. Both paths write to the same schema.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SEQUENCE: Record<string, string> = {
  EU: "vat_invoice_seq_eu",
  UK: "vat_invoice_seq_uk",
  AU: "vat_invoice_seq_au",
};

interface ReqBody {
  order_id: string;
  jurisdiction: "EU" | "UK" | "AU";
  supply_date: string;
  customer_name: string;
  customer_address: string;
  customer_vat_number?: string | null;
  customer_vat_validated?: boolean | null;
  supplier_vat_number: string;
  currency_code: "USD" | "EUR" | "GBP" | "AUD";
  net_amount_cents: number;
  vat_rate_pct: number;
  vat_amount_cents: number;
  gross_amount_cents: number;
  reverse_charge_applied?: boolean;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: ReqBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  const db = admin();
  const seqName = SEQUENCE[body.jurisdiction];
  if (!seqName) return new Response(JSON.stringify({ ok: false, error: `unsupported jurisdiction ${body.jurisdiction}` }), { status: 400 });

  // Server-side cross-check (Sherlock review): reverse_charge_applied=TRUE
  // requires a matching 'valid' VIES/HMRC/ABR validation row. Otherwise a
  // client could assert reverse-charge and ship a non-compliant invoice.
  if (body.reverse_charge_applied === true) {
    if (!body.customer_vat_number) {
      return new Response(JSON.stringify({ ok: false, error: "reverse_charge_applied=true but no customer_vat_number provided" }), { status: 400 });
    }
    const { data: validation } = await db
      .from("international_vat_number_validations")
      .select("validation_id, validation_result")
      .eq("vat_number", body.customer_vat_number)
      .eq("jurisdiction_code", body.jurisdiction)
      .eq("validation_result", "valid")
      .order("validated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!validation) {
      return new Response(JSON.stringify({ ok: false, error: "reverse_charge_applied=true requires a prior valid validation row for this VAT number + jurisdiction" }), { status: 409 });
    }
  }

  const { data: num, error: numErr } = await db.rpc("allocate_vat_invoice_number", { p_sequence_name: seqName });
  if (numErr || !num) return new Response(JSON.stringify({ ok: false, error: `sequence allocation failed: ${numErr?.message}` }), { status: 500 });

  const { data: ins, error: insErr } = await db.from("international_vat_invoices").insert({
    order_id: body.order_id,
    invoice_number: num as unknown as string,
    jurisdiction_code: body.jurisdiction,
    supply_date: body.supply_date,
    customer_name: body.customer_name,
    customer_address: body.customer_address,
    customer_vat_number: body.customer_vat_number ?? null,
    customer_vat_validated: body.customer_vat_validated ?? null,
    supplier_vat_number: body.supplier_vat_number,
    currency_code: body.currency_code,
    net_amount_cents: body.net_amount_cents,
    vat_rate_pct: body.vat_rate_pct,
    vat_amount_cents: body.vat_amount_cents,
    gross_amount_cents: body.gross_amount_cents,
    reverse_charge_applied: !!body.reverse_charge_applied,
    status: "issued",
  }).select("invoice_id, invoice_number").single();
  if (insErr || !ins) return new Response(JSON.stringify({ ok: false, error: insErr?.message ?? "insert failed" }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, invoice_id: (ins as { invoice_id: string }).invoice_id, invoice_number: (ins as { invoice_number: string }).invoice_number }), {
    headers: { "content-type": "application/json" },
  });
});
