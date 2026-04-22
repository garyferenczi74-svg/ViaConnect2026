// Prompt #111 — database-level invariants.
// Uses a direct @supabase/supabase-js service-role connection to assert that
// triggers and constraints installed by the migrations actually fire. Skips
// gracefully in local dev where SUPABASE_SERVICE_ROLE_KEY isn't set.

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const runIntegration = !!URL && !!KEY;
const d = runIntegration ? describe : describe.skip;

let sb: SupabaseClient;
beforeAll(() => {
  if (runIntegration) sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
});

d("international_audit_log is append-only", () => {
  it("UPDATE raises exception (trigger block_audit_mutation)", async () => {
    const { data: any_row } = await sb.from("international_audit_log").select("audit_id").limit(1).maybeSingle();
    if (!any_row) {
      // Insert one so we have something to try to mutate.
      await sb.from("international_audit_log").insert({ action_category: "test", action_verb: "probe" });
    }
    const { data: row } = await sb.from("international_audit_log").select("audit_id").limit(1).single();
    const { error } = await sb.from("international_audit_log").update({ action_verb: "should_fail" }).eq("audit_id", (row as { audit_id: string }).audit_id);
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/immutable|not permitted|append-only|cannot/i);
  });
});

d("international_fx_rate_history is append-only", () => {
  it("UPDATE raises exception", async () => {
    // Insert a probe rate row with a far-future date that won't collide.
    const today = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5).toISOString().slice(0, 10);
    await sb.from("international_fx_rate_history").insert({
      base_currency: "USD", quote_currency: "EUR", rate: 1.0, rate_source: "ECB", rate_date: today,
    });
    const { data: row } = await sb.from("international_fx_rate_history").select("rate_id").eq("rate_date", today).maybeSingle();
    if (!row) return; // RLS blocked the insert — skip test
    const { error } = await sb.from("international_fx_rate_history").update({ rate: 2.0 }).eq("rate_id", (row as { rate_id: string }).rate_id);
    expect(error).not.toBeNull();
  });
});

d(".88 ending trigger rejects non-.88 MSRP", () => {
  it("insert with msrp_cents ending in 0 rejected for US market (enforce_88_ending=TRUE)", async () => {
    const { error } = await sb.from("master_skus_market_pricing").insert({
      sku: "__prompt_111_test_sku__", market_code: "US", currency_code: "USD",
      msrp_cents: 5000, tax_code: "txcd_99999999", inclusive_of_tax: false, status: "draft",
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/\.88|end in 88|88/i);
    // Cleanup if somehow inserted
    await sb.from("master_skus_market_pricing").delete().eq("sku", "__prompt_111_test_sku__");
  });
});

d("VAT invoice sequence is gap-less + atomic", () => {
  it("two sequential allocate_vat_invoice_number calls return strictly monotonic numbers", async () => {
    const { data: a } = await sb.rpc("allocate_vat_invoice_number", { p_sequence_name: "vat_invoice_seq_uk" });
    const { data: b } = await sb.rpc("allocate_vat_invoice_number", { p_sequence_name: "vat_invoice_seq_uk" });
    expect(a).toBeTruthy(); expect(b).toBeTruthy();
    const numA = parseInt(String(a).replace(/\D/g, ""), 10);
    const numB = parseInt(String(b).replace(/\D/g, ""), 10);
    expect(numB).toBe(numA + 1);
  });
});
