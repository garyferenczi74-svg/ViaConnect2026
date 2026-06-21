// Prompt 204 (2026-06-21): per-genotype severity for CannabisIQ. Authored by Hannah
// and signed off by Gary (2026-06-21), reversing the earlier "educational, no
// scoring" decision for this panel. Merged into VARIANT_SEVERITY under the
// "cannabis-iq" panel slug.
//
// COMPLIANCE POSTURE (stricter than the other panels): cannabinoid response
// genetics is EDUCATION, never advice, never a recommendation to use or avoid
// cannabis, and never a diagnosis. The psychoactive response gene tiers below
// describe adverse response SENSITIVITY in a non-deterministic, non-diagnostic way
// only. Per Hannah and the gate: DRD2 (rs1800497, physically in ANKK1, a dopamine
// density proxy) stays UNSCORED; the endocannabinoid tone genes (CNR1, CNR2, FAAH,
// MGLL) and ABCB1 stay UNSCORED. Four SNPs are scored.
//
// Effect alleles (verified): CYP2C9 rs1057910 C (*3, Ile359Leu, reduced clearance,
// *3/*3 = poor metabolizer, a CPIC grade star allele that also affects many
// medications); CYP3A4 rs35599367 T (*22, rare decreased function, slower clearance
// and broad medication interactions); COMT rs4680 A (Val158Met, A = Met, slow
// clearing, only Met/Met is scored); AKT1 rs2494732 C (C/C associated with higher
// reported adverse psychological effects from heavy cannabis use versus T/T, Di
// Forti 2012, PMID 22831980; orientation confirmed against dbSNP and the source,
// C is the risk allele). Both heterozygous orderings are listed because severityFor
// matches without sorting.
//
// Standing rules honored: no invented tiers, neutral non-diagnostic tone, no em or
// en dashes, TypeScript strict.

import type { SeverityTier } from "@/lib/genetics/severity";

export const CANNABIS_IQ_SEVERITY_DRAFT: Record<string, Record<string, SeverityTier>> = {
  rs1057910: { AA: "low", AC: "moderate", CA: "moderate", CC: "high" },
  rs35599367: { CC: "low", CT: "moderate", TC: "moderate", TT: "moderate" },
  // COMT: only Met/Met (AA) is scored; one copy is typical.
  rs4680: { GG: "low", GA: "low", AG: "low", AA: "moderate" },
  // AKT1: C is the risk allele; C/C is the higher sensitivity genotype.
  rs2494732: { TT: "low", TC: "moderate", CT: "moderate", CC: "high" },
};
