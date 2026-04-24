// Prompt #124 P1: Reference-corpus matcher (first pass).
//
// Given a suspect-image pHash, find candidate SKUs in the reference corpus
// via Hamming-distance nearest-neighbor. The matcher's output feeds two
// downstream decisions:
//   1. candidateSkus is the set of SKUs the vision model will focus on.
//   2. exactMatch = true means the suspect image is byte-identical (or
//      perceptually identical) to an existing authentic marketing photo —
//      strong signal for the "authentic (likely reseller using official
//      imagery)" branch of the determination engine.
//
// When the approved corpus is empty (Phase A pre-shoot), the matcher
// returns zero candidates. The determination engine then short-circuits
// to unrelated_product with an inconclusive tier — this keeps the pipeline
// functional even before the reference images land.

import type { ReferenceCorpusEntry } from './types';
import { PHASH_NEAR_DUPLICATE_THRESHOLD, hammingDistance } from './phash';

export interface CorpusMatchResult {
  candidateSkus: string[];
  citedReferenceIds: string[];
  closestByDistance: Array<{
    referenceId: string;
    sku: string;
    artifactKind: string;
    version: string;
    distance: number;
  }>;
  exactMatch: boolean;
  corpusWasEmpty: boolean;
}

export interface CorpusMatchOptions {
  /** How many SKUs to surface as candidates. Default 3. */
  maxCandidates?: number;
  /** Override the near-duplicate threshold. Default from phash.ts. */
  nearDuplicateThreshold?: number;
}

/**
 * Match a suspect perceptual hash against the approved corpus. Pure function;
 * caller supplies the corpus entries (loaded via Supabase in the API layer).
 */
export function matchAgainstCorpus(
  suspectPhash: string,
  corpus: readonly ReferenceCorpusEntry[],
  opts: CorpusMatchOptions = {},
): CorpusMatchResult {
  const maxCandidates = opts.maxCandidates ?? 3;
  const nearDupThreshold = opts.nearDuplicateThreshold ?? PHASH_NEAR_DUPLICATE_THRESHOLD;

  if (corpus.length === 0) {
    return {
      candidateSkus: [],
      citedReferenceIds: [],
      closestByDistance: [],
      exactMatch: false,
      corpusWasEmpty: true,
    };
  }

  // Compute distance for every entry (corpus is typically ≤ 2000 entries —
  // a single studio photo per SKU per artifact kind ≈ 169 × ~10 = 1,690).
  const scored = corpus
    .filter((e) => e.approved && !e.retired)
    .map((e) => ({
      referenceId: e.id,
      sku: e.sku,
      artifactKind: e.artifactKind,
      version: e.version,
      distance: hammingDistance(suspectPhash, e.perceptualHash),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (scored.length === 0) {
    return {
      candidateSkus: [],
      citedReferenceIds: [],
      closestByDistance: [],
      exactMatch: false,
      corpusWasEmpty: true,
    };
  }

  const closest = scored[0];
  const exactMatch = closest.distance <= nearDupThreshold;

  // Collect unique SKUs from the closest entries; preserves distance ordering.
  const seenSku = new Set<string>();
  const candidateSkus: string[] = [];
  const citedReferenceIds: string[] = [];
  for (const s of scored) {
    if (candidateSkus.length >= maxCandidates) break;
    if (!seenSku.has(s.sku) && s.distance <= nearDupThreshold * 3) {
      seenSku.add(s.sku);
      candidateSkus.push(s.sku);
    }
    // Cite up to 8 closest references regardless of SKU for the vision model.
    if (citedReferenceIds.length < 8) {
      citedReferenceIds.push(s.referenceId);
    }
  }

  return {
    candidateSkus,
    citedReferenceIds,
    closestByDistance: scored.slice(0, 8),
    exactMatch,
    corpusWasEmpty: false,
  };
}

/**
 * Pull the full set of approved, non-retired corpus entries for a given
 * SKU. Used when the candidate-SKU set is already narrowed (e.g., from
 * Hounddog's matched_product_id) and we want every artifact kind for that
 * SKU as vision-input context.
 */
export function filterCorpusBySku(
  corpus: readonly ReferenceCorpusEntry[],
  sku: string,
): ReferenceCorpusEntry[] {
  return corpus.filter((e) => e.sku === sku && e.approved && !e.retired);
}
