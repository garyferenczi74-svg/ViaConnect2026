// Prompt 208a Module B (2026-06-22): panel-based diplotype calling engine.
//
// PANEL-BASED SIMPLIFICATION: this engine only uses the rsIDs present in
// clinicalSnps.ts. It does NOT implement the full CPIC/PharmGKB star-allele
// table, does NOT handle CYP2D6 CNV (gene duplication -> ultrarapid), and does
// NOT handle CYP2C19 *17 (gain-of-function -> rapid/ultrarapid). Those require
// a flag-off PharmGKB integration that is out of scope for this panel. The
// confidence field is always 'panel-based' to reflect this limitation.
//
// Genes covered: CYP2C19 (*2 rs4244285, *3 rs4986893), CYP2D6 (*4 rs3892097),
// CYP2C9 (*3 rs1057910). CYP1A2 rs762551 is in clinicalSnps but has no
// well-established LOF star allele (it is a *1F slow-metabolizer variant, not a
// true LOF), so it is excluded from DIPLOTYPE_DEFINITIONS; do NOT invent star
// alleles for it.
//
// No em/en-dashes. No emojis. Pure engine; never throws.

import { normalizeGenotype } from '@/lib/genetics/variantSeverity';

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type Metabolizer =
  | 'poor'
  | 'intermediate'
  | 'normal'
  | 'rapid'
  | 'ultrarapid'
  | 'indeterminate';

export interface DiplotypeDefinition {
  gene: string;
  lofRsids: { rsid: string; riskAllele: string; star: string }[];
  evidenceTier: 1 | 2 | 3;
}

export interface DiplotypeCall {
  gene: string;
  diplotype: string;
  metabolizer: Metabolizer;
  confidence: string;
  evidenceTier: number;
}

// ---------------------------------------------------------------------------
// Definitions -- ONLY rsIDs present in clinicalSnps.ts
// ---------------------------------------------------------------------------

/**
 * Panel-based LOF definitions. Each lofRsid encodes one loss-of-function star
 * allele. Evidence tier 2 = well established but panel-limited (not full CPIC
 * allele table + CNV).
 */
export const DIPLOTYPE_DEFINITIONS: DiplotypeDefinition[] = [
  {
    gene: 'CYP2C19',
    lofRsids: [
      { rsid: 'rs4244285', riskAllele: 'A', star: '*2' },
      { rsid: 'rs4986893', riskAllele: 'A', star: '*3' },
    ],
    evidenceTier: 2,
  },
  {
    gene: 'CYP2D6',
    lofRsids: [
      { rsid: 'rs3892097', riskAllele: 'A', star: '*4' },
    ],
    evidenceTier: 2,
  },
  {
    gene: 'CYP2C9',
    lofRsids: [
      { rsid: 'rs1057910', riskAllele: 'C', star: '*3' },
    ],
    evidenceTier: 2,
  },
];

// ---------------------------------------------------------------------------
// countLofAlleles
// ---------------------------------------------------------------------------

/**
 * Count copies of riskAllele in a normalized genotype string (0, 1, or 2).
 * Returns 0 for null input or any non-clean normalized form (not length 1 or 2
 * after normalization).
 *
 * Examples: ('AA', 'A') -> 2; ('GA', 'A') -> 1; ('GG', 'A') -> 0; (null) -> 0.
 */
export function countLofAlleles(genotype: string | null, riskAllele: string): number {
  if (!genotype) return 0;
  const normalized = normalizeGenotype(genotype);
  // After normalization a diploid call is 1-2 uppercase bases. Anything else
  // (zygosity token, indeterminate, empty) is treated as uninterpretable -> 0.
  if (normalized.length < 1 || normalized.length > 2) return 0;
  const target = riskAllele.toUpperCase();
  let count = 0;
  for (const base of normalized) {
    if (base === target) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// metabolizerFromLof
// ---------------------------------------------------------------------------

/**
 * Map a total LOF allele count to a metabolizer phenotype.
 *
 * PANEL LIMITATION: this simplified model cannot capture:
 * - Gain-of-function (*17 in CYP2C19, *1xN duplications in CYP2D6) -> rapid/ultrarapid.
 * - CNV (copy number variation) increasing functional copies.
 * Those categories require the flag-off PharmGKB full allele table and are out
 * of scope for this panel-based build.
 *
 * Mapping (standard CPIC convention for LOF-only panels):
 *   0 LOF alleles -> normal metabolizer (*1/*1 equivalent)
 *   1 LOF allele  -> intermediate metabolizer
 *  >=2 LOF alleles -> poor metabolizer
 */
export function metabolizerFromLof(totalLof: number): Metabolizer {
  if (totalLof === 0) return 'normal';
  if (totalLof === 1) return 'intermediate';
  return 'poor';
}

// ---------------------------------------------------------------------------
// callDiplotype
// ---------------------------------------------------------------------------

/**
 * Call a diplotype for one gene definition given the user's genotypeByRsid map.
 *
 * Returns null if NONE of the gene's rsIDs are present in genotypeByRsid
 * (not assessable with this panel).
 *
 * Diplotype string construction:
 *   - Accumulate which star alleles are called and how many copies.
 *   - 0 total LOF: '*1/*1'
 *   - 1 total LOF, one rsid contributed 1 copy: '*1/<star>'
 *   - 2 total LOF from the SAME rsid: '<star>/<star>'
 *   - 2 total LOF from TWO different rsids (compound): '<star1>/<star2>'
 *   - >2: '<star>/<star>' using the highest-copy LOF allele (edge case, kept simple).
 */
export function callDiplotype(
  def: DiplotypeDefinition,
  genotypeByRsid: Record<string, string | null>,
): DiplotypeCall | null {
  // Determine which rsIDs are present in the caller's map.
  const presentRsids = def.lofRsids.filter((l) => l.rsid in genotypeByRsid);
  if (presentRsids.length === 0) return null;

  // Count LOF alleles per rsid.
  const lofPerRsid: { star: string; count: number }[] = presentRsids.map((l) => ({
    star: l.star,
    count: countLofAlleles(genotypeByRsid[l.rsid] ?? null, l.riskAllele),
  }));

  const totalLof = lofPerRsid.reduce((sum, x) => sum + x.count, 0);
  const metabolizer = metabolizerFromLof(totalLof);

  // Build diplotype string.
  let diplotype: string;
  if (totalLof === 0) {
    diplotype = '*1/*1';
  } else if (totalLof === 1) {
    // Exactly one copy somewhere.
    const contributor = lofPerRsid.find((x) => x.count > 0)!;
    diplotype = `*1/${contributor.star}`;
  } else {
    // >= 2 total LOF. Collect contributors in order.
    const stars: string[] = [];
    for (const entry of lofPerRsid) {
      for (let i = 0; i < entry.count; i++) {
        stars.push(entry.star);
      }
    }
    // Represent as first/second (e.g. *2/*2 or *2/*3); cap at two slots.
    const a = stars[0] ?? '*1';
    const b = stars[1] ?? stars[0] ?? '*1';
    diplotype = `${a}/${b}`;
  }

  return {
    gene: def.gene,
    diplotype,
    metabolizer,
    confidence: 'panel-based',
    evidenceTier: def.evidenceTier,
  };
}

// ---------------------------------------------------------------------------
// callAllDiplotypes
// ---------------------------------------------------------------------------

/**
 * Call diplotypes for every definition in DIPLOTYPE_DEFINITIONS, dropping
 * genes where none of the panel rsIDs are present.
 */
export function callAllDiplotypes(
  genotypeByRsid: Record<string, string | null>,
): DiplotypeCall[] {
  const results: DiplotypeCall[] = [];
  for (const def of DIPLOTYPE_DEFINITIONS) {
    const call = callDiplotype(def, genotypeByRsid);
    if (call !== null) {
      results.push(call);
    }
  }
  return results;
}
