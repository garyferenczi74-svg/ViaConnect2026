// Prompt #113 — Representative subset of the §11.2 golden test set (24 of 120).
// Stage 1 detector only (LLM-gated verdicts mocked in later suite).

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/compliance/detector/lexicon-loader", () => ({
  loadDiseaseLexicon: async () => [
    { term: "diabetes", variant_group: "diabetes", icd10_code: "E11", severity_level: 4 },
    { term: "type 2 diabetes", variant_group: "diabetes", icd10_code: "E11", severity_level: 4 },
    { term: "cancer", variant_group: "cancer", icd10_code: "C80", severity_level: 5 },
    { term: "heart disease", variant_group: "heart", icd10_code: "I25", severity_level: 4 },
    { term: "hypertension", variant_group: "hypertension", icd10_code: "I10", severity_level: 3 },
    { term: "depression", variant_group: "depression", icd10_code: "F32", severity_level: 4 },
    { term: "anxiety", variant_group: "anxiety", icd10_code: "F41", severity_level: 3 },
    { term: "arthritis", variant_group: "arthritis", icd10_code: "M19", severity_level: 3 },
    { term: "alzheimers", variant_group: "dementia", icd10_code: "G30", severity_level: 5 },
    { term: "asthma", variant_group: "asthma", icd10_code: "J45", severity_level: 3 },
    { term: "ibs", variant_group: "ibs", icd10_code: "K58", severity_level: 2 },
    { term: "cold", variant_group: "cold", icd10_code: "J00", severity_level: 2 },
  ],
  invalidateLexicon: () => {},
}));

import { detectDiseaseClaim } from "@/lib/compliance/detector";

// 12 expected-COMPLIANT + 12 expected-FLAG cases from the §11.2 golden set.
const GOLDEN_COMPLIANT: readonly string[] = [
  "Supports healthy immune function",
  "Helps maintain cardiovascular health",
  "A source of antioxidants for the maintenance of good health",
  "Supports digestion",
  "Promotes restful sleep",
  "Helps with healthy cognitive function",
  "Contributes to normal bone health",
  "Supports normal metabolism",
  "Helps maintain healthy cholesterol levels already within the normal range",
  "A good source of vitamin D",
  "Contains vitamin C which contributes to the normal function of the immune system",
  "Supports energy metabolism",
];

const GOLDEN_FLAGGED: readonly string[] = [
  "Treats the common cold",
  "Prevents heart disease",
  "Cures type 2 diabetes",
  "Replaces your statin",
  "Better than metformin at lowering glucose",
  "Eliminates need for insulin",
  "Reverses alzheimers progression",
  "Diagnoses anxiety",
  "Prevents cancer metastasis",
  "Mitigates depression symptoms",
  "Heals arthritis",
  "Stops asthma attacks",
];

describe("Golden set (subset) — compliant claims do NOT flag", () => {
  for (const claim of GOLDEN_COMPLIANT) {
    it(`ok: ${claim}`, async () => {
      const r = await detectDiseaseClaim(claim);
      expect(r.requires_stage2, `expected no Stage 2 for: ${claim}`).toBe(false);
    });
  }
});

describe("Golden set (subset) — non-compliant claims DO flag", () => {
  for (const claim of GOLDEN_FLAGGED) {
    it(`flag: ${claim}`, async () => {
      const r = await detectDiseaseClaim(claim);
      expect(r.flagged, `expected flagged for: ${claim}`).toBe(true);
    });
  }
});
