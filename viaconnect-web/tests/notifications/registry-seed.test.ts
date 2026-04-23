// Prompt #112 — Registry seed shape invariants (scanned from the migration file).

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIG_DIR = path.resolve(__dirname, "..", "..", "supabase", "migrations");
const seedMigFile = readdirSync(MIG_DIR).find((f) => f.includes("prompt_112_enums_and_registry"))!;
const body = readFileSync(path.join(MIG_DIR, seedMigFile), "utf8");

describe("Registry seed", () => {
  it("seeds at least the 28 required event types", () => {
    // Count the VALUE tuples (not an exact parse, but a reasonable proxy).
    const lineCount = (body.match(/^\('[a-z_]+', /gm) ?? []).length;
    expect(lineCount).toBeGreaterThanOrEqual(28);
  });

  it("includes physician_order_request_received as urgent", () => {
    expect(body).toContain("'physician_order_request_received'");
    expect(body).toMatch(/'physician_order_request_received'[\s\S]{0,400}'urgent'/);
  });

  it("includes cap_waiver_review_requested routed to legal_ops_scope=TRUE", () => {
    expect(body).toContain("'cap_waiver_review_requested'");
  });

  it("foreshadows #113/#114/#115/#116 stubs with default_enabled=FALSE", () => {
    expect(body).toContain("'fda_hc_regulatory_trigger'");
    expect(body).toContain("'counterfeit_customs_event'");
    expect(body).toContain("'trademark_renewal_reminder'");
    expect(body).toContain("'litigation_docket_update'");
  });

  it("attorney_work_product flag set TRUE on gray-market + litigation rows", () => {
    expect(body).toMatch(/'gray_market_escalation_raised'[\s\S]{0,600}TRUE,\s*TRUE/);
    expect(body).toMatch(/'litigation_docket_update'[\s\S]{0,600}TRUE,\s*TRUE/);
  });
});
