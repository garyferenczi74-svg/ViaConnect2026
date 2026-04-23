// Prompt #113 — Stage 1 detector tests using an inline lexicon (avoids DB call).

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/compliance/detector/lexicon-loader", () => ({
  loadDiseaseLexicon: async () => [
    { term: "diabetes", variant_group: "diabetes", icd10_code: "E11", severity_level: 4 },
    { term: "type 2 diabetes", variant_group: "diabetes", icd10_code: "E11", severity_level: 4 },
    { term: "cancer", variant_group: "cancer", icd10_code: "C80", severity_level: 5 },
    { term: "hypertension", variant_group: "hypertension", icd10_code: "I10", severity_level: 3 },
    { term: "anxiety", variant_group: "anxiety", icd10_code: "F41", severity_level: 3 },
    { term: "alzheimers", variant_group: "dementia", icd10_code: "G30", severity_level: 5 },
  ],
  invalidateLexicon: () => {},
}));

import { detectDiseaseClaim } from "@/lib/compliance/detector";

describe("detectDiseaseClaim — known disease claims trigger Stage 2", () => {
  it("flags 'Cures diabetes'", async () => {
    const r = await detectDiseaseClaim("Cures diabetes in 30 days.");
    expect(r.flagged).toBe(true);
    expect(r.requires_stage2).toBe(true);
  });
  it("flags 'Treats cancer'", async () => {
    const r = await detectDiseaseClaim("This supplement treats cancer.");
    expect(r.flagged).toBe(true);
    expect(r.requires_stage2).toBe(true);
  });
  it("flags 'Prevents heart attack' via cancer-like severity even without direct term", async () => {
    const r = await detectDiseaseClaim("Prevents alzheimers progression.");
    expect(r.flagged).toBe(true);
    expect(r.requires_stage2).toBe(true);
  });
  it("flags multi-word disease term 'type 2 diabetes'", async () => {
    const r = await detectDiseaseClaim("Reverses type 2 diabetes.");
    expect(r.flagged).toBe(true);
    expect(r.requires_stage2).toBe(true);
  });
});

describe("detectDiseaseClaim — compliant claims pass", () => {
  it("allows 'Supports healthy immune function'", async () => {
    const r = await detectDiseaseClaim("Supports healthy immune function.");
    expect(r.flagged).toBe(false);
    expect(r.requires_stage2).toBe(false);
  });
  it("allows 'Helps maintain cardiovascular health'", async () => {
    const r = await detectDiseaseClaim("Helps maintain cardiovascular health.");
    expect(r.flagged).toBe(false);
  });
  it("allows 'A source of antioxidants'", async () => {
    const r = await detectDiseaseClaim("A source of antioxidants for the maintenance of good health.");
    expect(r.flagged).toBe(false);
  });
});

describe("detectDiseaseClaim — superiority patterns", () => {
  it("flags 'Replaces your statin'", async () => {
    const r = await detectDiseaseClaim("Replaces your statin for cholesterol management.");
    expect(r.flagged).toBe(true);
    const rules = r.flags.map((f) => f.rule);
    expect(rules).toContain("superiority_replaces_drug");
  });
  it("flags 'Better than metformin'", async () => {
    const r = await detectDiseaseClaim("Better than metformin at lowering glucose.");
    expect(r.flagged).toBe(true);
    const rules = r.flags.map((f) => f.rule);
    expect(rules).toContain("superiority_better_than_drug");
  });
  it("flags 'Eliminates need for SSRI'", async () => {
    const r = await detectDiseaseClaim("Eliminates the need for SSRI medication.");
    expect(r.flagged).toBe(true);
    const rules = r.flags.map((f) => f.rule);
    expect(rules).toContain("superiority_eliminates_need");
  });
});

describe("detectDiseaseClaim — empty + edge", () => {
  it("empty returns safe", async () => {
    const r = await detectDiseaseClaim("");
    expect(r.flagged).toBe(false);
    expect(r.requires_stage2).toBe(false);
  });
});
