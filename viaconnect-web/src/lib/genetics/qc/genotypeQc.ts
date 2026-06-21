// Prompt 208a Task A2 (2026-06-21): genotype QC engine.
// Runs between raw genotype parse and persistence. Detects build/strand/no-call
// problems and produces per-variant verdicts. Does NOT auto-correct.
//
// The strand/build REFERENCE dataset is flag-off (injected optional arg): when
// absent the engine still safely flags genuinely-unresolvable cases (palindromic
// SNPs, no-calls) and assumes forward-strand for the rest so the engine is not
// bricked in prod. When a reference IS supplied it catches strand flips.
//
// Pure, deterministic, never throws. Reuses normalizeGenotype from variantSeverity.ts.

import { normalizeGenotype } from '../variantSeverity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Orientation = 'ok' | 'reversed' | 'ambiguous' | 'unresolved';
export type CallQuality = 'high' | 'low' | 'no_call';

export interface QcVariantCall {
  rsid: string;
  raw_genotype: string;
  normalized_genotype: string;
  orientation: Orientation;
  orientation_resolved: boolean;
  call_quality: CallQuality;
  is_no_call: boolean;
  is_imputed: boolean;
}

export interface UploadQcResult {
  detected_build: string;
  normalized_build: string;
  qc_status: 'clean' | 'flagged' | 'blocked';
  normalization_confidence: number;
  calls: QcVariantCall[];
}

// ---------------------------------------------------------------------------
// Complement map - A<->T, C<->G
// ---------------------------------------------------------------------------
const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

function complementAllele(allele: string): string {
  return COMPLEMENT[allele] ?? allele;
}

// ---------------------------------------------------------------------------
// isNoCall
// ---------------------------------------------------------------------------

// Returns true for: '', '--', '00', 'NN', 'DD', 'II', or any string that is
// not a valid two-letter ACGT genotype call (after stripping separators).
export function isNoCall(genotype: string): boolean {
  if (genotype === '') return true;
  const NO_CALL_LITERALS = new Set(['--', '00', 'NN', 'DD', 'II']);
  if (NO_CALL_LITERALS.has(genotype)) return true;
  // After normalization, a valid call is 2 ACGT characters.
  const norm = normalizeGenotype(genotype);
  if (norm.length !== 2) return true;
  const ACGT = /^[ACGT]{2}$/;
  return !ACGT.test(norm);
}

// ---------------------------------------------------------------------------
// isPalindromic
// ---------------------------------------------------------------------------

// Returns true when the two distinct alleles in the (normalized) genotype are
// a Watson-Crick complementary pair: A with T, or C with G. These cannot be
// strand-resolved without an external reference. A homozygous call ('AA') is
// NOT palindromic because both alleles are the same base.
export function isPalindromic(genotype: string): boolean {
  const norm = normalizeGenotype(genotype);
  if (norm.length !== 2) return false;
  const a = norm[0];
  const b = norm[1];
  if (a === b) return false; // homozygous, not palindromic
  return complementAllele(a) === b;
}

// ---------------------------------------------------------------------------
// classifyCall
// ---------------------------------------------------------------------------

// Returns call classification. is_imputed defaults false (imputation cannot be
// detected without metadata; injected flags would extend this in future).
export function classifyCall(genotype: string): {
  is_no_call: boolean;
  is_imputed: boolean;
  call_quality: CallQuality;
} {
  const no_call = isNoCall(genotype);
  return {
    is_no_call: no_call,
    is_imputed: false,
    call_quality: no_call ? 'no_call' : 'high',
  };
}

// ---------------------------------------------------------------------------
// resolveOrientation
// ---------------------------------------------------------------------------

// Resolves strand orientation for a single genotype call.
//   no-call -> 'unresolved'.
//   With expectedAlleles: subset match -> 'ok'; complement subset -> 'reversed';
//     else -> 'ambiguous'.
//   Without expectedAlleles: palindromic -> 'ambiguous'; else -> 'ok'.
export function resolveOrientation(
  genotype: string,
  expectedAlleles?: string[],
): Orientation {
  if (isNoCall(genotype)) return 'unresolved';

  const norm = normalizeGenotype(genotype);
  // Extract the unique ACGT alleles from the normalized call.
  const genotypeAlleles = Array.from(new Set(norm.split(''))).filter(
    (a) => COMPLEMENT[a] !== undefined,
  );

  if (expectedAlleles && expectedAlleles.length > 0) {
    const refSet = new Set(expectedAlleles.map((a) => a.toUpperCase()));
    // Check if every allele in the genotype is in the expected set.
    const isSubset = genotypeAlleles.every((a) => refSet.has(a));
    if (isSubset) return 'ok';
    // Check for strand flip: the complement of the genotype alleles must EQUAL
    // the expected alleles set (same cardinality + same members). A partial
    // overlap (e.g. 'AA' where complement='T' is in {'C','T'} but the sets
    // differ in size) is 'ambiguous', not a confident flip call.
    const complementedAlleles = genotypeAlleles.map(complementAllele);
    const complementSet = new Set(complementedAlleles);
    const sameSize = complementSet.size === refSet.size;
    const complementMatchesRef = sameSize && complementedAlleles.every((a) => refSet.has(a));
    if (complementMatchesRef) return 'reversed';
    return 'ambiguous';
  }

  // Flag-off mode: no reference supplied.
  if (isPalindromic(genotype)) return 'ambiguous';
  return 'ok';
}

// ---------------------------------------------------------------------------
// runUploadQc
// ---------------------------------------------------------------------------

// Main entry point. Processes a batch of raw genotype rows and returns a full
// QC result including per-variant verdicts and aggregate metrics.
export function runUploadQc(
  rows: { rsid: string; genotype: string }[],
  opts?: {
    expectedAllelesByRsid?: Record<string, string[]>;
    buildMarkers?: Record<string, 'GRCh37' | 'GRCh38'>;
  },
): UploadQcResult {
  // Detect build from buildMarkers: use the first rsid that has an entry.
  let detectedBuild = 'unknown';
  if (opts?.buildMarkers) {
    for (const row of rows) {
      const build = opts.buildMarkers[row.rsid];
      if (build) {
        detectedBuild = build;
        break;
      }
    }
  }

  const calls: QcVariantCall[] = rows.map(({ rsid, genotype }) => {
    const normalized_genotype = normalizeGenotype(genotype);
    const { is_no_call, is_imputed, call_quality } = classifyCall(genotype);
    const expectedAlleles = opts?.expectedAllelesByRsid?.[rsid];
    const orientation = resolveOrientation(genotype, expectedAlleles);
    const orientation_resolved = orientation === 'ok';

    return {
      rsid,
      raw_genotype: genotype,
      normalized_genotype,
      orientation,
      orientation_resolved,
      call_quality,
      is_no_call,
      is_imputed,
    };
  });

  // Aggregate metrics.
  const resolvedCount = calls.filter(
    (c) => c.orientation_resolved && !c.is_no_call,
  ).length;
  const total = calls.length;
  const normalization_confidence = total === 0 ? 0 : resolvedCount / total;

  // qc_status: 'clean' if every call orientation_resolved && !is_no_call;
  // 'blocked' if NO call is resolved (all blocked); else 'flagged'.
  let qc_status: 'clean' | 'flagged' | 'blocked';
  if (total === 0) {
    qc_status = 'clean';
  } else if (resolvedCount === total) {
    qc_status = 'clean';
  } else if (resolvedCount === 0) {
    qc_status = 'blocked';
  } else {
    qc_status = 'flagged';
  }

  return {
    detected_build: detectedBuild,
    normalized_build: detectedBuild,
    qc_status,
    normalization_confidence,
    calls,
  };
}
