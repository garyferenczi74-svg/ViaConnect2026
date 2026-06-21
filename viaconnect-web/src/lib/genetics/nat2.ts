// Prompt 204 follow-up (go-live blocker 2): the dedicated NAT2 acetylator
// resolver. NAT2 acetylator status (rapid / intermediate / slow) is a COMPOSITE
// phenotype derived from several SNPs, so it cannot be scored through the
// single-rsID per-genotype severity map (severityFor keys one rsID to one
// genotype). This module is that dedicated resolver: it reads the slow-defining
// tag SNPs and returns the acetylator phenotype.
//
// SPEC (Hannah, established NAT2 population genetics, not invented):
//   Slow-defining tag SNPs (forward strand, variant = slow allele):
//     rs1801280 (NAT2*5, 341T>C, I114T) -> variant C
//     rs1799930 (NAT2*6, 590G>A, R197Q) -> variant A
//     rs1799931 (NAT2*7, 857G>A, G286E) -> variant A
//   rs1208 (803A>G, K268R) tags the NAT2*12 FUNCTIONAL (rapid) cluster, so it is
//   carried as descriptive context only and does NOT count toward slow alleles.
//
//   Phenotype rule (simplified variant-count method): count variant alleles across
//   the three slow-defining SNPs (0 / 1 / 2 each), cap the total at 2 (a person has
//   two haplotypes), then 0 -> rapid, 1 -> intermediate, 2 or more -> slow. All
//   three slow-defining SNPs are REQUIRED for a confident call; any missing or
//   unparseable -> null.
//
//   HONEST LIMITATION (Hannah, verbatim-usable): "This caller infers acetylator
//   phenotype from unphased tag-SNP genotypes using the simplified variant-count
//   method. It does not reconstruct the true diplotype (haplotype phase). In rare
//   cases where multiple slow variants are observed, exact star-allele assignment
//   would require phased data; the conservative cap means such cases are called
//   slow, which is the safe direction for this population."
//
// SEVERITY: NAT2 is PHENOTYPE-ONLY and UNTIERED (Hannah). Acetylator status in the
// nutrition context (heterocyclic amine and caffeine clearance) is a metabolic
// descriptor, not a graded High / Moderate / Low health risk. nat2SeverityTier
// returns null for every phenotype; it is the single gated seam should a future
// human clinical and compliance pass ever justify a tier (it would not be invented
// here). This matches the 204g posture of not inventing a score without a
// validated source.
//
// CITATIONS (all flagged UNVERIFIED until a human pulls exact metadata, per the
// 204d / 204h gate): Hein DW (NAT2 acetylator tag-SNP method); Sabbagh / Patin
// (NAT2 worldwide haplotype diversity); PharmGKB / CPIC NAT2. Do not present any
// as verified without the clinical and compliance pass.
//
// This module is PURE and standalone: deterministic, no side effects, no UI, not
// yet wired to any panel (NAT2 renders descriptively, unscored). It exists so the
// composite phenotype has a single correct home when NAT2 is surfaced at go-live.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { normalizeGenotype } from './variantSeverity';
import type { SeverityTier } from './severity';

export type Nat2Phenotype = 'rapid' | 'intermediate' | 'slow';

// The slow-defining tag SNPs and their forward-strand variant (slow) allele. Only
// these three count toward the slow-allele tally.
const NAT2_SLOW_TAG_SNPS: Readonly<Record<string, string>> = {
  rs1801280: 'C', // NAT2*5, 341T>C
  rs1799930: 'A', // NAT2*6, 590G>A
  rs1799931: 'A', // NAT2*7, 857G>A
};

// Count the variant (slow) alleles in one genotype call, or null when the value is
// not a clean two-base call (a phenotype, a missing value, a malformed string).
function variantAlleleCount(genotype: string, variantAllele: string): number | null {
  const g = normalizeGenotype(genotype);
  if (g.length !== 2) return null;
  return (g[0] === variantAllele ? 1 : 0) + (g[1] === variantAllele ? 1 : 0);
}

/**
 * Resolve NAT2 acetylator phenotype from a map of rsID to genotype call (for
 * example { rs1801280: "CC", rs1799930: "GG", rs1799931: "GG" }). Returns null
 * when any of the three required slow-defining SNPs is missing or unparseable, so
 * a partial upload never produces a misleading call. Order-independent (handles
 * "GA" == "AG") via normalizeGenotype.
 */
export function nat2AcetylatorPhenotype(
  genotypes: Readonly<Record<string, string | null | undefined>>,
): Nat2Phenotype | null {
  let total = 0;
  for (const [rsid, variantAllele] of Object.entries(NAT2_SLOW_TAG_SNPS)) {
    const raw = genotypes[rsid];
    if (!raw) return null; // a required SNP is missing
    const count = variantAlleleCount(raw, variantAllele);
    if (count === null) return null; // a required SNP is unparseable
    total += count;
  }
  // Cap at 2: a person has two haplotypes regardless of how many variant alleles
  // are observed across the tags (the unphased-inference safe direction).
  const slowAlleleCount = Math.min(total, 2);
  if (slowAlleleCount === 0) return 'rapid';
  if (slowAlleleCount === 1) return 'intermediate';
  return 'slow';
}

/** The human-readable descriptor for a phenotype (never a severity score). */
export function nat2PhenotypeLabel(phenotype: Nat2Phenotype): string {
  if (phenotype === 'rapid') return 'Rapid acetylator';
  if (phenotype === 'intermediate') return 'Intermediate acetylator';
  return 'Slow acetylator';
}

/**
 * NAT2 is phenotype-only and UNTIERED (Hannah). This returns null for every
 * phenotype: it is the single gated seam, never an invented score. A tier would
 * only ever be added through a human clinical and compliance pass.
 */
export function nat2SeverityTier(_phenotype: Nat2Phenotype): SeverityTier | null {
  return null;
}
