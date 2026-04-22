// =============================================================================
// intl-vat-number-validator (Prompt #111)
// =============================================================================
// Validates B2B tax IDs against jurisdiction services:
//   - EU VAT  -> VIES SOAP bridge (REST shim via ec.europa.eu/taxation_customs/vies)
//   - UK VAT  -> HMRC VAT API (OAuth-protected; token via env HMRC_BEARER)
//   - AU ABN  -> ABR JSON endpoint (requires ABR_GUID)
// On service_unavailable the caller treats the order as B2C (per §3.3).
// Records result in international_vat_number_validations.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HMRC_BEARER = Deno.env.get("HMRC_VAT_BEARER") ?? "";
const ABR_GUID    = Deno.env.get("ABR_GUID") ?? "";

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface ReqBody {
  vat_number: string;
  jurisdiction: "EU" | "UK" | "AU";
  order_id?: string;
}

async function validateVies(vatFull: string): Promise<{ result: "valid" | "invalid" | "service_unavailable"; raw: unknown }> {
  const m = vatFull.match(/^([A-Z]{2})(.+)$/i);
  if (!m) return { result: "invalid", raw: { reason: "no country prefix" } };
  const cc = m[1].toUpperCase();
  const num = m[2];
  try {
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${encodeURIComponent(num)}`;
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) return { result: "service_unavailable", raw: { status: r.status } };
    const body = await r.json();
    return { result: body?.isValid ? "valid" : "invalid", raw: body };
  } catch (e) {
    return { result: "service_unavailable", raw: { error: String(e) } };
  }
}

async function validateHmrc(vat: string): Promise<{ result: "valid" | "invalid" | "service_unavailable"; raw: unknown }> {
  const normalized = vat.replace(/^GB/i, "").replace(/\s+/g, "");
  const url = `https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/${encodeURIComponent(normalized)}`;
  try {
    const r = await fetch(url, {
      headers: {
        accept: "application/vnd.hmrc.2.0+json",
        ...(HMRC_BEARER ? { authorization: `Bearer ${HMRC_BEARER}` } : {}),
      },
    });
    if (r.status === 404) return { result: "invalid", raw: { status: 404 } };
    if (!r.ok) return { result: "service_unavailable", raw: { status: r.status } };
    const body = await r.json();
    return { result: body?.target?.vatNumber ? "valid" : "invalid", raw: body };
  } catch (e) {
    return { result: "service_unavailable", raw: { error: String(e) } };
  }
}

async function validateAbr(abn: string): Promise<{ result: "valid" | "invalid" | "service_unavailable"; raw: unknown }> {
  if (!ABR_GUID) return { result: "service_unavailable", raw: { error: "ABR_GUID not configured" } };
  const normalized = abn.replace(/\s+/g, "");
  const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${encodeURIComponent(normalized)}&guid=${encodeURIComponent(ABR_GUID)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { result: "service_unavailable", raw: { status: r.status } };
    const text = await r.text();
    // ABR returns a JSONP-ish wrapper: callback({...}). Strip parens.
    const stripped = text.replace(/^[^(]*\(/, "").replace(/\)\s*;?\s*$/, "");
    const body = JSON.parse(stripped);
    const active = body?.EntityStatusCode === "Active" || body?.AbnStatus === "Active";
    return { result: active ? "valid" : "invalid", raw: body };
  } catch (e) {
    return { result: "service_unavailable", raw: { error: String(e) } };
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: ReqBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  const db = admin();
  let svc: "VIES" | "HMRC" | "ABR";
  let outcome: { result: "valid" | "invalid" | "service_unavailable"; raw: unknown };
  if (body.jurisdiction === "EU") {      svc = "VIES"; outcome = await validateVies(body.vat_number); }
  else if (body.jurisdiction === "UK") { svc = "HMRC"; outcome = await validateHmrc(body.vat_number); }
  else if (body.jurisdiction === "AU") { svc = "ABR";  outcome = await validateAbr(body.vat_number); }
  else return new Response(JSON.stringify({ ok: false, error: "unsupported jurisdiction" }), { status: 400 });
  await db.from("international_vat_number_validations").insert({
    vat_number: body.vat_number,
    jurisdiction_code: body.jurisdiction,
    validation_service: svc,
    validation_result: outcome.result,
    validation_response_raw: outcome.raw,
    order_id: body.order_id ?? null,
  });
  return new Response(JSON.stringify({ ok: true, result: outcome.result, service: svc }), {
    headers: { "content-type": "application/json" },
  });
});
