// Prompt #113 — Scope-guard scanner + standing-rule invariants.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  FORBIDDEN_ALTER_TARGETS,
  FORBIDDEN_TABLE_PREFIXES,
  FORBIDDEN_INGREDIENT_MENTIONS,
  RETATRUTIDE_INVARIANTS,
} from "@/lib/compliance/scope-guards";

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "..", "supabase", "migrations");
const LIB_COMPLIANCE_DIR = path.resolve(__dirname, "..", "..", "src", "lib", "compliance");
const EDGE_FUNCS_DIR = path.resolve(__dirname, "..", "..", "supabase", "functions");

function prompt113Migrations(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.includes("prompt_113")).map((f) => path.join(MIGRATIONS_DIR, f));
}

describe("Prompt #113 migrations are append-only", () => {
  const migs = prompt113Migrations();
  it("finds at least three migration files", () => {
    expect(migs.length).toBeGreaterThanOrEqual(3);
  });

  for (const target of FORBIDDEN_ALTER_TARGETS) {
    it(`no ALTER TABLE ${target} in #113 migrations`, () => {
      // Allow the UPDATE on notification_event_registry (activating stub) but
      // the FORBIDDEN list includes that table; use a narrower rx on ALTER TABLE.
      const rx = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${target}\\b`, "i");
      for (const mig of migs) {
        const body = readFileSync(mig, "utf8");
        expect(body, `${path.basename(mig)} must not ALTER ${target}`).not.toMatch(rx);
      }
    });
  }

  it("no helix_ or peptide_ table INSERT/UPDATE/DELETE in #113 migrations", () => {
    // Match bare peptide_/helix_ tables only; exclude regulatory_peptide_*
    // (our own table) by requiring the identifier to start after a keyword
    // and whitespace + optional schema, NOT mid-word.
    const rx = /\b(?:INTO|UPDATE|FROM|ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+(?:public\.)?(helix_|peptide_)[a-zA-Z_]+/i;
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8");
      expect(body, `${path.basename(mig)} must not touch ${FORBIDDEN_TABLE_PREFIXES.join("/")} tables`).not.toMatch(rx);
    }
  });

  it("Semaglutide is never mentioned in any Prompt #113 migration (standing rule §1)", () => {
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8").toLowerCase();
      for (const forbidden of FORBIDDEN_INGREDIENT_MENTIONS) {
        expect(body, `${path.basename(mig)} must not mention ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("Retatrutide is seeded with the exact non-negotiable invariant", () => {
    const migBody = migs
      .map((m) => readFileSync(m, "utf8"))
      .join("\n");
    expect(migBody).toContain("retatrutide");
    // Must be seeded as not_approved, injectable_only=TRUE, can_make_sf_claims=FALSE
    expect(migBody).toMatch(/'retatrutide',\s*'not_approved',\s*TRUE,\s*FALSE/i);
  });
});

describe("lib/compliance scope guards", () => {
  function walk(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...walk(p));
      else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) files.push(p);
    }
    return files;
  }

  it("no helix_ or peptide_ table reads in lib/compliance", () => {
    const files = walk(LIB_COMPLIANCE_DIR);
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      const rx = /\.from\(\s*["'](?:helix_|peptide_)[a-zA-Z_]+["']/;
      expect(body, `${path.relative(LIB_COMPLIANCE_DIR, f)} must not read helix_/peptide_ tables`).not.toMatch(rx);
    }
  });

  it("no Semaglutide mention anywhere in lib/compliance (standing rule §1)", () => {
    const files = walk(LIB_COMPLIANCE_DIR);
    // Files where the word legitimately appears as part of the guard/meta
    // surface itself: the guard constant list, the detector's superiority
    // regex, and the Kelsey system prompt (which instructs the model to
    // never recommend the ingredient). Match via path.sep for Windows.
    const exemptEndings = [
      "scope-guards.ts",
      `detector${path.sep}regex-layer.ts`,
      `kelsey${path.sep}prompt.ts`,
      // Guard surfaces that must enumerate the prohibited string in order to
      // detect it. forbidden_phrases.ts has predated the test; rules/marketing.ts
      // (Prompt #138d INTERVENTION_SPECIFICITY corpus) joined under #138a/c/d.
      `dictionaries${path.sep}forbidden_phrases.ts`,
      `dictionaries${path.sep}unapproved_peptides.ts`,
      `rules${path.sep}marketing.ts`,
      `rules${path.sep}peptide.ts`,
      `rules${path.sep}social.ts`,
      `__tests__${path.sep}engine.test.ts`,
      `__tests__${path.sep}integration.test.ts`,
      `__tests__${path.sep}peptide.test.ts`,
    ];
    for (const f of files) {
      if (exemptEndings.some((e) => f.endsWith(e))) continue;
      const body = readFileSync(f, "utf8").toLowerCase();
      expect(body, `${path.relative(LIB_COMPLIANCE_DIR, f)} must not mention semaglutide`).not.toContain("semaglutide");
    }
  });
});

describe("alert sync edge function exists", () => {
  it("supabase/functions/compliance-alerts-daily-sync/index.ts is present", () => {
    const p = path.join(EDGE_FUNCS_DIR, "compliance-alerts-daily-sync", "index.ts");
    expect(() => readFileSync(p, "utf8")).not.toThrow();
  });
});

describe("Retatrutide invariant constants", () => {
  it("scope-guards exports the non-negotiable invariant", () => {
    expect(RETATRUTIDE_INVARIANTS.sku_id).toBe("retatrutide");
    expect(RETATRUTIDE_INVARIANTS.expected_compliance_class).toBe("not_approved");
    expect(RETATRUTIDE_INVARIANTS.expected_injectable_only).toBe(true);
    expect(RETATRUTIDE_INVARIANTS.expected_can_make_sf_claims).toBe(false);
  });
});
