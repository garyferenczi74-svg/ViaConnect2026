// Prompt 204d Phase 1 (2026-06-20): tests for the methylation SNP monograph seed.
// These lock the safety invariants that matter most for unvalidated KB drafts:
// every entry is pending and NOT retrievable (so isRetrievable is false for all of
// them), provenance review gates are null, ids are unique, and the consult caution
// is always present. They also confirm the 29-SNP coverage and the unverified
// citation flag that the human verification step must resolve.

import { describe, it, expect } from "vitest";
import { METHYLATION_SNP_MONOGRAPHS } from "../methylationSnpMonographs";
import { isRetrievable, meetsRetrievabilityPreconditions } from "../../knowledgeEntry";

describe("METHYLATION_SNP_MONOGRAPHS seed", () => {
  it("covers all 29 methylation panel SNPs as snp_monograph entries", () => {
    expect(METHYLATION_SNP_MONOGRAPHS).toHaveLength(29);
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(e.domain).toBe("snp_monograph");
    }
  });

  it("ships every entry pending and non-retrievable: nothing can reach the user", () => {
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(e.compliance_status).toBe("pending");
      expect(e.retrievable).toBe(false);
      // The hard gate: a pending, non-retrievable draft never passes isRetrievable.
      expect(isRetrievable(e)).toBe(false);
      // And it has not met the structural preconditions either (no clinician /
      // approver recorded, version 0).
      expect(meetsRetrievabilityPreconditions(e)).toBe(false);
    }
  });

  it("leaves the human review gates open (drafted by Hannah, not yet reviewed or approved)", () => {
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(e.provenance.drafted_by).toBe("hannah");
      expect(e.provenance.reviewed_by).toBeNull();
      expect(e.provenance.approved_by).toBeNull();
      expect(e.review.version).toBe(0);
    }
  });

  it("uses unique ids keyed to the rsID, matching canonical_keys", () => {
    const ids = METHYLATION_SNP_MONOGRAPHS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(e.id).toBe(`snp-${e.canonical_keys.rsid}`);
      expect(e.genotype_dependence).toEqual([e.canonical_keys.rsid]);
    }
  });

  it("attaches the non-diagnostic consult caution to every entry", () => {
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(
        e.contraindications_and_cautions.some((c) => c.includes("not a diagnosis")),
      ).toBe(true);
    }
  });

  it("has no unconfirmed citations left: the three flagged ones were verified against PubMed", () => {
    // The MTR (PMID 10520212), MAOA (PMID 1678250), and SHMT1 (PMID 11386852)
    // citations were confirmed against PubMed on 2026-06-20, so the verification
    // step is resolved (unverified false) and each carries a resolvable PubMed url.
    const unverified = METHYLATION_SNP_MONOGRAPHS.flatMap((e) =>
      e.citations.filter((c) => c.unverified === true),
    );
    expect(unverified.length).toBe(0);
    for (const pmid of ["10520212", "1678250", "11386852"]) {
      const found = METHYLATION_SNP_MONOGRAPHS.some((e) =>
        e.citations.some((c) => c.url === `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`),
      );
      expect(found, `PMID ${pmid} url present`).toBe(true);
    }
  });

  it("never manufactures a citation for a synonymous or no-function variant", () => {
    // The D-graded synonymous variants carry no citation.
    const synonymous = ["snp-rs2066470", "snp-rs1802059", "snp-rs4633", "snp-rs769224", "snp-rs1801181", "snp-rs2298758"];
    for (const id of synonymous) {
      const e = METHYLATION_SNP_MONOGRAPHS.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e?.evidence_grade).toBe("D");
      expect(e?.citations).toHaveLength(0);
    }
  });

  it("uses only valid evidence grades", () => {
    for (const e of METHYLATION_SNP_MONOGRAPHS) {
      expect(["A", "B", "C", "D"]).toContain(e.evidence_grade);
    }
  });
});
