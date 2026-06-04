// =============================================================================
// Prompt 175 Part D (2026-06-04): canonical reference match.
//
// For each extracted supplement, query the existing search_supplements_v2
// RPC and decide whether the top hit is confident enough to attach as the
// canonical id. Confident matches surface to the UI as "matched, pending
// confirmation"; ambiguous or empty matches surface as "needs confirmation"
// with the raw text prefilling the existing manual search.
//
// The route layer NEVER commits matched items to CAQ phase data on its
// own; the UI requires explicit user confirmation per 175 Part E.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedSupplement } from './types';

export type MatchStatus = 'matched' | 'needs_confirmation';

export interface CanonicalMatchResult {
  status: MatchStatus;
  canonicalId: string | null;
  canonicalName: string | null;
  canonicalBrand: string | null;
  similarity: number; // 0..1
}

export interface MatchedExtraction extends ExtractedSupplement {
  match: CanonicalMatchResult;
}

// Confidence threshold for "matched, pending confirmation". A top hit with
// similarity below this routes to "needs confirmation" even when the row
// exists. Locked here so the human-confirmation surface stays consistent
// regardless of which extraction tier produced the result.
export const CANONICAL_MATCH_THRESHOLD = 0.7;

interface SupplementSearchHit {
  id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  brand_id?: string | null;
  product_name?: string | null;
  ingredient_name?: string | null;
  brand_name?: string | null;
  display_name?: string | null;
  match_score?: number | null;
  similarity?: number | null;
}

/**
 * Run the existing search_supplements_v2 RPC for an extracted item and
 * return the canonical match decision. Defensive: any RPC failure routes
 * to needs_confirmation rather than throwing so the UI always has a path
 * to manual entry.
 */
export async function matchExtractedItem(
  extracted: ExtractedSupplement,
  supabase: SupabaseClient,
): Promise<CanonicalMatchResult> {
  const query = buildQueryString(extracted);
  if (!query) return emptyResult();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('search_supplements_v2', {
      query_text: query,
      result_limit: 5,
      brand_filter: undefined,
    });
    if (error || !Array.isArray(data) || data.length === 0) {
      return emptyResult();
    }
    const top = data[0] as SupplementSearchHit;
    const similarity = normalizeScore(top);
    if (similarity >= CANONICAL_MATCH_THRESHOLD) {
      return {
        status: 'matched',
        canonicalId: top.product_id ?? top.ingredient_id ?? top.id ?? null,
        canonicalName: top.product_name ?? top.ingredient_name ?? top.display_name ?? null,
        canonicalBrand: top.brand_name ?? null,
        similarity,
      };
    }
    return {
      status: 'needs_confirmation',
      canonicalId: null,
      canonicalName: top.product_name ?? top.ingredient_name ?? top.display_name ?? null,
      canonicalBrand: top.brand_name ?? null,
      similarity,
    };
  } catch {
    return emptyResult();
  }
}

/**
 * Run the canonical match for every extracted item in parallel. Returns
 * the items in the same order they were given.
 */
export async function matchAllExtracted(
  items: ReadonlyArray<ExtractedSupplement>,
  supabase: SupabaseClient,
): Promise<MatchedExtraction[]> {
  const matches = await Promise.all(items.map((it) => matchExtractedItem(it, supabase)));
  return items.map((it, i) => ({ ...it, match: matches[i] }));
}

function buildQueryString(extracted: ExtractedSupplement): string {
  const parts: string[] = [];
  if (extracted.brand) parts.push(extracted.brand);
  if (extracted.name) parts.push(extracted.name);
  return parts.join(' ').trim();
}

function normalizeScore(hit: SupplementSearchHit): number {
  const raw = hit.match_score ?? hit.similarity ?? null;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 1) return raw <= 100 ? raw / 100 : 1; // tolerate percent-scale
  return raw;
}

function emptyResult(): CanonicalMatchResult {
  return {
    status: 'needs_confirmation',
    canonicalId: null,
    canonicalName: null,
    canonicalBrand: null,
    similarity: 0,
  };
}
