// Prompt 204 (2026-06-20): DRAFT per-genotype severity for NutrigenDX. PENDING the
// human clinical and compliance gate (Gary). This is NOT merged into
// VARIANT_SEVERITY (src/lib/genetics/variantSeverity.ts) and is read by nothing
// live; it is imported only by its test. The only path to live is the gate.
//
// Shape mirrors VARIANT_SEVERITY exactly: rsID (lowercase) -> normalized genotype
// (uppercase, no separators, per normalizeGenotype) -> validated SeverityTier.
//
// FTO rs9939609 tiering rationale (forward strand, effect allele A, reference T):
//   TT -> low      Homozygous reference, no effect allele, typical baseline.
//   AT -> low      One copy. The per copy body weight effect is small and highly
//                  modifiable, so a single copy does not warrant a Moderate score.
//   AA -> moderate Two copies. A consistent, replicated appetite and body weight
//                  tendency, but a tendency that diet and activity strongly modify,
//                  so Moderate, never High.
// No genotype is graded High: FTO shifts appetite, it does not set an outcome, and
// nothing here supports a High clinical score. Any genotype without a defensible
// tier is omitted so it renders the honest unscored fallback.
//
// GO-LIVE BLOCKER for the gate (does not affect this non-live draft): the
// general genotype severity ladder is CLINICAL, not a pure allele-copy count, so
// it is not always monotonic (for example FADS1 TT and VDR ff score moderate, not
// high). The 204i STATUS chip and the 204i/204k matched-row highlight currently
// DERIVE their tier from allele copy count (the methylation zygosity model:
// 0 copies Typical, 1 Moderate, 2 High). That assumption holds for methylation
// but NOT for this panel, so before NutrigenDX goes live the STATUS chip and the
// matched-row highlight must read the validated severity tier directly (per the
// stored genotype), not re-derive it from copy count, or they will mislabel rows.
//
// Standing rules honored: no invented tiers, no em or en dashes, TypeScript
// strict (no any).

import type { SeverityTier } from "@/lib/genetics/severity";

export const NUTRIGEN_DX_SEVERITY_DRAFT: Record<string, Record<string, SeverityTier>> = {
  rs9939609: {
    TT: "low",
    AT: "low",
    AA: "moderate",
  },
  // Batch A. fut2 (rs601338) and slc30a8 (rs13266634) are deliberately omitted:
  // FUT2 secretor status is a descriptive type, not a severity, and SLC30A8 is a
  // small lifestyle-dominated population signal, so both render the honest
  // unscored fallback rather than a misleading tier.
  rs1801133: { CC: "low", CT: "moderate", TT: "high" },
  rs174537: { GG: "low", GT: "moderate", TT: "moderate" },
  rs1801198: { CC: "low", CG: "moderate", GG: "moderate" },
  // VDR Fok1: the SCORE keys on the stored alleles (C/T), not the F/f display
  // shorthand, because the live normalizeGenotype uppercases and would collapse
  // Ff and ff. Effect allele f is C: FF maps to TT, Ff to CT, ff to CC.
  rs2228570: { TT: "low", CT: "low", CC: "moderate" },
  rs33972313: { GG: "low", GA: "moderate", AA: "high" },
  rs4588: { CC: "low", CA: "low", AA: "moderate" },
  rs7946: { GG: "low", GA: "low", AA: "moderate" },
  // Batch B. amy1 (AMY1-CNV) omitted: copy-number descriptive marker, not a tier.
  "rs5082":    { "TT": "low", "TC": "low",      "CC": "moderate" },
  "rs1800588": { "CC": "low", "CT": "low",      "TT": "low" },
  "rs7903146": { "CC": "low", "CT": "moderate", "TT": "high" },
  "rs4880":    { "CC": "low", "CT": "low",      "TT": "moderate" },
  "rs1050450": { "CC": "low", "CT": "low",      "TT": "moderate" },
  "rs1800795": { "GG": "low", "GC": "low",      "CC": "moderate" },
  "rs1800629": { "GG": "low", "GA": "low",      "AA": "moderate" },
  "rs1001179": { "CC": "low", "CT": "low",      "TT": "moderate" },
  // Batch C. gstm1, gstt1, hla-dq2-and-hla-dq8 omitted: descriptive present/null or haplotype markers, not tiers.
  // NutrigenDX Batch C severity rows. Omitted by design: gstm1, gstt1, and
  // hla-dq2-and-hla-dq8 are descriptive present or null and haplotype calls, NOT
  // tiered. mcm6 is omitted too, since lactase non persistence is the normal
  // global default and a high to low scale would misrepresent a normal trait.
  "rs10156191": { "CC": "low", "CT": "moderate", "TT": "high" }, // DAO, effect allele T
  "rs2231142": { "CC": "low", "CT": "moderate", "TT": "high" }, // ABCG2 Q141K, effect allele T
  "rs4410790": { "TT": "low", "CT": "moderate", "CC": "moderate" }, // AHR, effect allele C, behavioral tendency capped at moderate
  // NAT2 is omitted: acetylator status (rapid / intermediate / slow) is a COMPOSITE
  // phenotype derived from several SNPs, not a single-rsID genotype, so the live
  // severityFor lookup (one rsID, one normalized genotype) cannot score it. It
  // renders the honest unscored fallback and its report shows the acetylator status
  // descriptively. Scoring it would need a dedicated NAT2 phenotype resolver (a
  // go-live item for the gate), not this per-genotype map.
};
