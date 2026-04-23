// Prompt #118 — Scope-guard scanner for #118 artifacts.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIG_DIR  = path.resolve(__dirname, "..", "..", "supabase", "migrations");
const SVG_DIR  = path.resolve(__dirname, "..", "..", "src", "components", "body-tracker", "body-graphic", "assets");
const FLAG_FILE = path.resolve(__dirname, "..", "..", "src", "lib", "feature-flags.ts");

const FORBIDDEN_ALTER_TARGETS = [
  "master_skus","pricing_tiers","product_catalog","products","orders","order_items",
  "shop_orders","shop_order_items","genex360_products","genex360_purchases",
  "kit_registrations","genetic_profiles","peptide_registry","peptide_delivery_options",
  "peptide_rules","user_peptide_prescriptions",
  "body_tracker_entries","body_tracker_weight","body_tracker_segmental_fat",
  "body_tracker_segmental_muscle","body_tracker_metabolic","body_tracker_milestones",
  "body_tracker_scores","notifications","notification_event_registry",
  "notification_preferences","notification_channel_credentials","notifications_dispatched",
  "ingredients","regulatory_claim_library","regulatory_kelsey_reviews","regulatory_audit_log",
] as const;

function prompt118Migrations(): string[] {
  return readdirSync(MIG_DIR).filter((f) => f.includes("prompt_118")).map((f) => path.join(MIG_DIR, f));
}

describe("Prompt #118 migration discipline", () => {
  const migs = prompt118Migrations();
  it("finds at least one migration file", () => {
    expect(migs.length).toBeGreaterThanOrEqual(1);
  });

  for (const target of FORBIDDEN_ALTER_TARGETS) {
    it(`no ALTER TABLE ${target} in #118 migrations`, () => {
      const rx = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${target}\\b`, "i");
      for (const mig of migs) {
        const body = readFileSync(mig, "utf8");
        expect(body, `${path.basename(mig)} must not ALTER ${target}`).not.toMatch(rx);
      }
    });
  }

  it("no INSERT/UPDATE/DELETE on existing peptide_/helix_ tables", () => {
    const rx = /\b(?:INTO|UPDATE|FROM|ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+(?:public\.)?(helix_|peptide_)[a-zA-Z_]+/i;
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8");
      expect(body, `${path.basename(mig)} must not touch helix_/peptide_ tables`).not.toMatch(rx);
    }
  });

  it("Semaglutide never mentioned (standing rule §1.8)", () => {
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8").toLowerCase();
      expect(body).not.toContain("semaglutide");
    }
  });
});

describe("4 SVG asset components present + structured", () => {
  const expected = ["MaleFront.tsx", "MaleBack.tsx", "FemaleFront.tsx", "FemaleBack.tsx"];
  for (const name of expected) {
    it(`${name} exists + has named body-form + role=img`, () => {
      const body = readFileSync(path.join(SVG_DIR, name), "utf8");
      expect(body).toContain('id="body-form"');
      expect(body).toContain('role="img"');
      expect(body).toContain('viewBox="0 0 400 800"');
    });
  }
});

describe("feature-flag entry", () => {
  const body = readFileSync(FLAG_FILE, "utf8");
  it("declares BODY_GRAPHICS_V2_ENABLED as a flag", () => {
    expect(body).toContain("BODY_GRAPHICS_V2_ENABLED");
  });
  it("exports isFeatureEnabled", () => {
    expect(body).toContain("export function isFeatureEnabled");
  });
  it("supports NEXT_PUBLIC_ prefix for client-side access", () => {
    expect(body).toContain("NEXT_PUBLIC_");
  });
});
