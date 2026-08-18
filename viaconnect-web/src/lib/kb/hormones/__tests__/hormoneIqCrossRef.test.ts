/**
 * HormoneIQ cross-ref: SNPs + labs, no fabrication.
 */

import { describe, expect, it } from "vitest";
import { buildHormoneIqCrossRef } from "../hormoneIqCrossRef";
import { generateHormoneReport } from "../generateHormoneReport";
import { FLAGSHIP_HORMONE_DRAFTS } from "../flagshipDraft";

describe("buildHormoneIqCrossRef", () => {
  it("cross-refs COMT genotype with related estrogen metabolite labs", () => {
    const payload = buildHormoneIqCrossRef(
      [
        {
          rsid: "rs4680",
          gene: "COMT",
          genotype: "AA",
          status: null,
          clinical_significance: null,
          is_sample: false,
          severity: "moderate",
        },
      ],
      [
        {
          biomarker: "2-OH estrogen",
          value: 12,
          unit: "ng/mg",
          reference_low: null,
          reference_high: null,
          measured_at: "2026-08-01T12:00:00Z",
        },
        {
          biomarker: "Glucose",
          value: 90,
          unit: "mg/dL",
          reference_low: 70,
          reference_high: 99,
          measured_at: "2026-08-01T12:00:00Z",
        },
      ],
    );

    expect(payload.summary.snp_count).toBe(1);
    expect(payload.snp_results[0].gene).toBe("COMT");
    expect(payload.snp_results[0].genotype_label).toMatch(/slower/i);
    expect(payload.snp_results[0].related_labs_found.length).toBeGreaterThan(0);
    expect(payload.summary.lab_matched_count).toBeGreaterThan(0);
    expect(payload.snps_missing).toContain("CYP19A1");
  });

  it("stays empty when user has no HormoneIQ data", () => {
    const payload = buildHormoneIqCrossRef([], []);
    expect(payload.summary.has_any_data).toBe(false);
    expect(payload.snp_results).toHaveLength(0);
    expect(payload.summary.lab_matched_count).toBe(0);
  });
});

describe("generateHormoneReport + HormoneIQ", () => {
  it("embeds hormoneiq_crossref and merges SNP education into genetics_context", () => {
    const r = generateHormoneReport({
      profileSex: "female",
      labs: [
        {
          biomarker: "Estradiol",
          value: 80,
          unit: "pg/mL",
          reference_low: 15,
          reference_high: 350,
          measured_at: "2026-08-01T12:00:00Z",
        },
      ],
      hormones: FLAGSHIP_HORMONE_DRAFTS.map((h) => ({ ...h })),
      genetics: [],
      influences: [],
      hormoneIqVariants: [
        {
          rsid: "rs4680",
          gene: "COMT",
          genotype: "GA",
          status: null,
          clinical_significance: null,
          is_sample: true,
          severity: null,
        },
      ],
    });
    expect(r.ok && !r.needsSex).toBe(true);
    if (!r.ok || r.needsSex || !r.report) throw new Error("expected report");
    expect(r.report.hormoneiq_crossref.summary.snp_count).toBe(1);
    expect(r.report.overview.data_sources).toContain("hormoneiq_genex360");
    expect(r.report.genetics_context.some((g) => g.rsid === "rs4680")).toBe(
      true,
    );
    expect(JSON.stringify(r.report)).not.toMatch(/[\u2013\u2014]/);
  });
});
