// Prompt #113 — Migration-file seed content validation.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIG_DIR = path.resolve(__dirname, "..", "..", "supabase", "migrations");

function load(sub: string): string {
  const f = readdirSync(MIG_DIR).find((name) => name.includes(sub));
  if (!f) throw new Error(`Migration not found: ${sub}`);
  return readFileSync(path.join(MIG_DIR, f), "utf8");
}

describe("jurisdictions seed", () => {
  const body = load("prompt_113_jurisdictions_ingredients_claims");
  it("seeds US with the exact DSHEA disclaimer text", () => {
    expect(body).toContain("This statement has not been evaluated by the Food and Drug Administration.");
    expect(body).toContain("not intended to diagnose, treat, cure, or prevent any disease.");
  });
  it("seeds CA with SOR/2003-196 statute ref and NO disclaimer", () => {
    expect(body).toContain("SOR/2003-196");
    expect(body).toMatch(/\('CA'[\s\S]*?,\s*NULL\s*\)/);
  });
});

describe("peptide classifications seed", () => {
  const body = load("prompt_113_disease_alerts_sku_peptide");
  it("Retatrutide: not_approved + injectable_only=TRUE + can_make_sf_claims=FALSE", () => {
    expect(body).toMatch(/'retatrutide',\s*'not_approved',\s*TRUE,\s*FALSE/);
  });
  it("BPC-157 + TB-500 + Epithalon + Semax + Selank are research_use_only", () => {
    for (const p of ["bpc-157","tb-500","epithalon","semax","selank"]) {
      const rx = new RegExp(`'${p}'\\s*,\\s*'research_use_only'`, "i");
      expect(body, `missing seed for ${p}`).toMatch(rx);
    }
  });
  it("Ipamorelin + CJC-1295 are compounded_503a", () => {
    for (const p of ["ipamorelin","cjc-1295"]) {
      expect(body).toMatch(new RegExp(`'${p}'.*'compounded_503a'`));
    }
  });
  it("Semaglutide is NOT seeded (standing rule §1)", () => {
    expect(body.toLowerCase()).not.toContain("semaglutide");
  });
});

describe("disease dictionary seed", () => {
  const body = load("prompt_113_disease_alerts_sku_peptide");
  const criticalTerms = ["diabetes","cancer","hypertension","alzheimers","depression","heart attack","ibs","psoriasis","arthritis","copd"];
  for (const t of criticalTerms) {
    it(`seeds critical consumer term: ${t}`, () => {
      expect(body).toContain(`'${t}'`);
    });
  }
  it("seeds both 'hypertension' and 'high blood pressure' consumer variants", () => {
    expect(body).toContain("'hypertension'");
    expect(body).toContain("'high blood pressure'");
  });
  it("seeds both 'heart attack' and 'myocardial infarction'", () => {
    expect(body).toContain("'heart attack'");
    expect(body).toContain("'myocardial infarction'");
  });
});

describe("#112 stub activation", () => {
  const body = load("prompt_113_kelsey_audit_disclaimer");
  it("activates fda_hc_regulatory_trigger via UPDATE", () => {
    expect(body).toMatch(/UPDATE\s+public\.notification_event_registry[\s\S]*default_enabled\s*=\s*TRUE[\s\S]*fda_hc_regulatory_trigger/i);
  });
  it("records emission source as #113", () => {
    expect(body).toMatch(/emission_source\s*=\s*'prompt_113/);
  });
});
