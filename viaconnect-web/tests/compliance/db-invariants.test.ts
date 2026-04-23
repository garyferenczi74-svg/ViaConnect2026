// Prompt #113 — DB-level invariants. Skipped without service-role env.

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const run = !!URL && !!KEY;
const d = run ? describe : describe.skip;

let sb: SupabaseClient;
beforeAll(() => {
  if (run) sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
});

d("regulatory_audit_log is append-only", () => {
  it("UPDATE raises immutability error", async () => {
    const { data: row } = await sb.from("regulatory_audit_log").select("id").limit(1).maybeSingle();
    if (!row) return;
    const { error } = await sb.from("regulatory_audit_log").update({ action: "tampered" }).eq("id", (row as { id: number }).id);
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/immutable|not permitted|append-only/i);
  });
});

d("regulatory_kelsey_reviews is append-only", () => {
  it("DELETE raises immutability error", async () => {
    const { data: row } = await sb.from("regulatory_kelsey_reviews").select("id").limit(1).maybeSingle();
    if (!row) return;
    const { error } = await sb.from("regulatory_kelsey_reviews").delete().eq("id", (row as { id: string }).id);
    expect(error).not.toBeNull();
  });
});

d("Retatrutide peptide classification invariants enforced at DB", () => {
  it("retatrutide row has the exact locked values", async () => {
    const { data } = await sb.from("regulatory_peptide_classifications")
      .select("compliance_class, injectable_only, can_make_sf_claims")
      .eq("sku_id", "retatrutide").maybeSingle();
    expect(data).not.toBeNull();
    const r = data as { compliance_class: string; injectable_only: boolean; can_make_sf_claims: boolean };
    expect(r.compliance_class).toBe("not_approved");
    expect(r.injectable_only).toBe(true);
    expect(r.can_make_sf_claims).toBe(false);
  });
});

d("fda_hc_regulatory_trigger #112 stub is activated by #113", () => {
  it("default_enabled is TRUE + emission_source identifies #113", async () => {
    const { data } = await sb.from("notification_event_registry")
      .select("default_enabled, emission_source")
      .eq("event_code", "fda_hc_regulatory_trigger").maybeSingle();
    expect(data).not.toBeNull();
    const r = data as { default_enabled: boolean; emission_source: string | null };
    expect(r.default_enabled).toBe(true);
    expect(r.emission_source ?? "").toContain("113");
  });
});
