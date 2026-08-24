/**
 * NutrigenDX cross-ref for Nutrition by Genetics Results tab.
 */

import { describe, expect, it } from "vitest";
import {
  buildNutrigenDxCrossRefPayload,
  relatedFindingsForGene,
} from "../nutrigenDxCrossRef";
import type { NutritionGeneticFinding } from "../types";

describe("nutrigenDxCrossRef", () => {
  it("builds markers from nutrition panel variants with deep education", () => {
    const payload = buildNutrigenDxCrossRefPayload(
      [
        {
          rsid: "rs9939609",
          gene: "FTO",
          genotype: "AA",
          status: null,
          clinical_significance: null,
          is_sample: false,
          severity: "moderate",
        },
        {
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "CT",
          status: null,
          clinical_significance: null,
          is_sample: true,
          severity: null,
        },
      ],
      [],
    );

    expect(payload.summary.marker_count).toBe(2);
    expect(payload.summary.has_any_data).toBe(true);
    expect(payload.resultSet.markers.some((m) => m.gene === "FTO")).toBe(true);
    const fto = payload.resultSet.markers.find((m) => m.gene === "FTO");
    expect(fto?.impactSummary.toLowerCase()).toMatch(/appetite|allele/);
    expect(payload.summary.missing_genes.length).toBeGreaterThan(0);
  });

  it("includes nutrigendx findings and soft gene cross-ref", () => {
    const findings: NutritionGeneticFinding[] = [
      {
        id: "1",
        userId: "u",
        source: "nutrigendx",
        sourceRefId: "r",
        category: "vitamin",
        itemName: "Active folate",
        itemSlug: "folate",
        direction: "need",
        strength: "moderate",
        confidence: "high",
        estimated: false,
        rationale: "MTHFR genotype raises demand for methylfolate.",
        createdAt: "2026-08-01T00:00:00Z",
        supersededAt: null,
      },
    ];
    const payload = buildNutrigenDxCrossRefPayload(
      [
        {
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "TT",
          status: null,
          clinical_significance: null,
          is_sample: false,
          severity: "moderate",
        },
      ],
      findings,
    );
    expect(payload.summary.finding_count).toBe(1);
    const related = relatedFindingsForGene("MTHFR", payload.resultSet.findings);
    expect(related).toHaveLength(1);
  });

  it("stays empty with no variants and no findings", () => {
    const payload = buildNutrigenDxCrossRefPayload([], []);
    expect(payload.summary.has_any_data).toBe(false);
  });
});
