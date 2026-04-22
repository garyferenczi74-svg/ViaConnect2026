// =============================================================================
// intl-market-availability-activator (Prompt #111)
// =============================================================================
// HTTP endpoint. Flips is_available_in_market = TRUE on a
// master_skus_market_pricing row, but ONLY if:
//   (a) the caller provides typed_confirmation matching exactly
//       "ACTIVATE {sku} {market_code}"
//   (b) the row is in status 'active' (already price-approved)
//   (c) Gary or Domenic (profile.role = 'admin' + explicit user_id allow list
//       via env ALLOWED_ACTIVATORS; blank env means admin is sufficient)
// Every activation writes to international_audit_log with typed_confirmation_text.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ACTIVATORS = (Deno.env.get("ALLOWED_ACTIVATORS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface ReqBody {
  pricing_id: string;
  typed_confirmation: string;
  actor_user_id: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: ReqBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid json" }), { status: 400 }); }
  const db = admin();

  const { data: pricing, error: pErr } = await db
    .from("master_skus_market_pricing")
    .select("pricing_id, sku, market_code, currency_code, status, is_available_in_market")
    .eq("pricing_id", body.pricing_id)
    .maybeSingle();
  if (pErr || !pricing) return new Response(JSON.stringify({ ok: false, error: "pricing_id not found" }), { status: 404 });
  const p = pricing as { pricing_id: string; sku: string; market_code: string; currency_code: string; status: string; is_available_in_market: boolean };

  if (p.status !== "active") {
    return new Response(JSON.stringify({ ok: false, error: `row must be active (was '${p.status}') before availability can be enabled` }), { status: 409 });
  }
  const expected = `ACTIVATE ${p.sku} ${p.market_code}`;
  if (body.typed_confirmation !== expected) {
    return new Response(JSON.stringify({ ok: false, error: `typed_confirmation must match exactly "${expected}"` }), { status: 400 });
  }

  const { data: actor } = await db.from("profiles").select("id, role").eq("id", body.actor_user_id).maybeSingle();
  const actorRole = actor ? (actor as { role: string }).role : null;
  if (actorRole !== "admin") {
    return new Response(JSON.stringify({ ok: false, error: "actor must have admin role" }), { status: 403 });
  }
  if (ALLOWED_ACTIVATORS.length > 0 && !ALLOWED_ACTIVATORS.includes(body.actor_user_id)) {
    return new Response(JSON.stringify({ ok: false, error: "actor not in ALLOWED_ACTIVATORS list" }), { status: 403 });
  }

  const { error: upErr } = await db
    .from("master_skus_market_pricing")
    .update({ is_available_in_market: true, updated_at: new Date().toISOString() })
    .eq("pricing_id", body.pricing_id);
  if (upErr) return new Response(JSON.stringify({ ok: false, error: upErr.message }), { status: 500 });

  await db.from("international_audit_log").insert({
    actor_user_id: body.actor_user_id,
    actor_role: actorRole,
    action_category: "market_availability",
    action_verb: "availability.activated",
    target_table: "master_skus_market_pricing",
    target_id: body.pricing_id,
    market_code: p.market_code,
    currency_code: p.currency_code,
    before_state_json: { is_available_in_market: p.is_available_in_market },
    after_state_json:  { is_available_in_market: true },
    typed_confirmation_text: body.typed_confirmation,
  });

  return new Response(JSON.stringify({ ok: true, sku: p.sku, market_code: p.market_code }), {
    headers: { "content-type": "application/json" },
  });
});
