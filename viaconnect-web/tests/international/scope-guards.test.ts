// Prompt #111 — scope guard invariants + migration scanner.
// Gate 4 enforcement. Scans Prompt #111 migrations for forbidden patterns.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  FORBIDDEN_ALTER_TARGETS,
  FORBIDDEN_TABLE_PREFIXES,
  PROTECTED_PATHS,
  SAFE_SUM_HELPERS,
} from "@/lib/international/scope-guards";

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "..", "supabase", "migrations");
const LIB_INTL_DIR   = path.resolve(__dirname, "..", "..", "src", "lib", "international");
const EDGE_FUNCS_DIR = path.resolve(__dirname, "..", "..", "supabase", "functions");

function prompt111Migrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes("prompt_111"))
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

describe("scope-guards constants", () => {
  it("forbidden ALTER targets include existing tables named in §3.2", () => {
    for (const t of ["master_skus", "orders", "order_items", "genex360_purchases", "kit_registrations", "genetic_profiles"]) {
      expect(FORBIDDEN_ALTER_TARGETS).toContain(t);
    }
  });
  it("forbidden table prefixes include helix_", () => {
    expect(FORBIDDEN_TABLE_PREFIXES).toContain("helix_");
  });
  it("protected files include package.json and supabase email templates", () => {
    expect(PROTECTED_PATHS).toContain("package.json");
    expect(PROTECTED_PATHS).toContain("package-lock.json");
    expect(PROTECTED_PATHS).toContain("supabase/config.toml");
  });
  it("exports canonical cross-currency helpers", () => {
    expect(SAFE_SUM_HELPERS).toContain("sumByCurrency");
    expect(SAFE_SUM_HELPERS).toContain("sumToUsdCents");
    expect(SAFE_SUM_HELPERS).toContain("convertToUsdCents");
  });
});

describe("migration scanner — Prompt #111 migrations MUST NOT ALTER existing schema", () => {
  const migs = prompt111Migrations();
  it("finds at least four Prompt #111 migration files", () => {
    expect(migs.length).toBeGreaterThanOrEqual(4);
  });

  for (const target of FORBIDDEN_ALTER_TARGETS) {
    it(`no ALTER TABLE ${target} in Prompt #111 migrations`, () => {
      const rx = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.|)${target}\\b`, "i");
      for (const mig of migs) {
        const body = readFileSync(mig, "utf8");
        expect(body, `${path.basename(mig)} must not ALTER ${target}`).not.toMatch(rx);
      }
    });
  }

  it("Prompt #111 migrations do not write to helix_* tables", () => {
    const rx = /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE\s+TABLE)\s+[^;]*helix_[a-zA-Z_]+/i;
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8");
      expect(body, `${path.basename(mig)} must not touch helix_* tables`).not.toMatch(rx);
    }
  });
});

describe("lib/international scope guards", () => {
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

  it("no lib file imports or reads helix_* tables", () => {
    const files = walk(LIB_INTL_DIR);
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      // Match .from("helix_...") or .from('helix_...')
      const rx = /\.from\(\s*["']helix_[a-zA-Z_]+["']/;
      expect(body, `${path.relative(LIB_INTL_DIR, f)} must not reference helix_* tables`).not.toMatch(rx);
    }
  });

  it("no edge function imports or reads helix_* tables", () => {
    const dirs = readdirSync(EDGE_FUNCS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("intl-"));
    for (const d of dirs) {
      const idx = path.join(EDGE_FUNCS_DIR, d.name, "index.ts");
      const body = readFileSync(idx, "utf8");
      const rx = /\.from\(\s*["']helix_[a-zA-Z_]+["']/;
      expect(body, `${d.name} must not reference helix_* tables`).not.toMatch(rx);
    }
  });
});
