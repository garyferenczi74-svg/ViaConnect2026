// Prompt 204 (2026-06-21): per-genotype severity for PeptideIQ. Authored by Hannah
// and signed off by Gary (2026-06-21), reversing the earlier "educational, no
// scoring" decision for this panel so a real DNA upload populates the Your Variants
// list with a tier where one is defensible. Merged into VARIANT_SEVERITY under the
// "peptide-iq" panel slug.
//
// Shape mirrors VARIANT_SEVERITY: rsID (lowercase) -> normalized genotype
// (uppercase, no separators, per normalizeGenotype) -> validated SeverityTier. Both
// heterozygous orderings are listed (for example GT and TG) because severityFor
// matches the stored call without sorting, and a raw file may report either order.
//
// SCORING DISCIPLINE: most PeptideIQ genes are physiological response variants, not
// risk variants, so only three earn a tier and ALL are capped at Moderate. There is
// no High tier in this panel: no peptide genotype here carries a well established
// high clinical risk. Every other PeptideIQ SNP is OMITTED from this map by design
// and renders the honest unscored fallback (it still appears in the list with its
// genotype, from clinicalSnps, just without a tier).
//
// Effect alleles (forward strand, verified): MC4R rs17782313 C (near-MC4R, BMI and
// appetite associated, small per copy effect); COL1A1 rs1800012 T (Sp1 site G>T, the
// "s" allele, altered collagen ratio with tendon, ligament, and bone density
// tendency); NOS3 rs1799983 T (Glu298Asp, G894T, lower basal nitric oxide).
//
// Standing rules honored: no invented tiers, no em or en dashes, TypeScript strict.

import type { SeverityTier } from "@/lib/genetics/severity";

export const PEPTIDE_IQ_SEVERITY_DRAFT: Record<string, Record<string, SeverityTier>> = {
  rs17782313: { TT: "low", TC: "moderate", CT: "moderate", CC: "moderate" },
  rs1800012: { GG: "low", GT: "moderate", TG: "moderate", TT: "moderate" },
  rs1799983: { GG: "low", GT: "moderate", TG: "moderate", TT: "moderate" },
};
