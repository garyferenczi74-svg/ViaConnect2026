// Photo Sync prompt §3.3: candidate-key generation + confidence scoring.
//
// Priority order (1 = highest):
//   1. SKU exact (normalize(sku))
//   2. Slug exact (normalize(slug)) when slug is present
//   3. Category-prefixed SKU (normalize("{category}/{sku}"))
//   4. Variant: normalize("{parent_sku}-{delivery_form}") — wins over the
//      parent's base image if present
//   5. Levenshtein distance <= 2 against any bucket key (only if no
//      higher-priority match found). Distance 3+ is never accepted.
//
// Tie-break across multiple priority-1..4 hits at the same priority:
//   - prefer .webp extension over .png/.jpg
//   - then prefer the most recently uploaded file

import { normalizeFilename, normalizePathToKey } from './normalizeFilename';
import { levenshteinDistance } from './levenshtein';
import type { BucketObject, MatchConfidence, ProductRow, ProductVariantRow } from './types';

export interface MatchInput {
  product: Pick<ProductRow, 'sku' | 'slug' | 'category'>;
  variant?: Pick<ProductVariantRow, 'sku' | 'delivery_form'> | null;
  parent_sku?: string | null;        // when matching a variant, the parent product's SKU
  bucket_objects: ReadonlyArray<BucketObject>;
  bucket_keys_index: ReadonlyMap<string, BucketObject[]>;  // normalized_key -> objects (may be many for ties)
}

export interface MatchCandidate {
  full_path: string;
  priority: 1 | 2 | 3 | 4 | 5;
  source: string;
  distance?: number;
}

export interface MatchResult {
  chosen: MatchCandidate | null;
  confidence: MatchConfidence;
  candidates: MatchCandidate[];
}

const EXT_PREFERENCE: Record<string, number> = { webp: 0, avif: 1, png: 2, jpg: 3, jpeg: 3 };

function extScore(full_path: string): number {
  const ext = full_path.toLowerCase().split('.').pop() ?? '';
  return EXT_PREFERENCE[ext] ?? 99;
}

function pickBest(candidates: ReadonlyArray<BucketObject>): BucketObject {
  return [...candidates].sort((a, b) => {
    const ea = extScore(a.full_path);
    const eb = extScore(b.full_path);
    if (ea !== eb) return ea - eb;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  })[0];
}

function lookupExact(key: string, bucket_keys_index: ReadonlyMap<string, BucketObject[]>): BucketObject | null {
  const objs = bucket_keys_index.get(key);
  if (!objs || objs.length === 0) return null;
  return pickBest(objs);
}

export function matchProductToFile({ product, variant, parent_sku, bucket_objects, bucket_keys_index }: MatchInput): MatchResult {
  const candidates: MatchCandidate[] = [];

  // Priority 1: SKU exact (variant SKU takes precedence over product SKU when matching a variant)
  const targetSku = variant?.sku ?? product.sku;
  if (targetSku) {
    const key = normalizeFilename(targetSku);
    const hit = lookupExact(key, bucket_keys_index);
    if (hit) candidates.push({ full_path: hit.full_path, priority: 1, source: 'sku_exact' });
  }

  // Priority 2: Slug exact
  if (!candidates.length && product.slug) {
    const key = normalizeFilename(product.slug);
    const hit = lookupExact(key, bucket_keys_index);
    if (hit) candidates.push({ full_path: hit.full_path, priority: 2, source: 'slug_exact' });
  }

  // Priority 3: Category-prefixed SKU
  if (!candidates.length && product.category && targetSku) {
    const key = normalizeFilename(`${product.category}/${targetSku}`);
    const hit = lookupExact(key, bucket_keys_index);
    if (hit) candidates.push({ full_path: hit.full_path, priority: 3, source: 'category_sku' });
  }

  // Priority 4: variant {parent_sku}-{delivery_form}
  if (!candidates.length && variant && parent_sku && variant.delivery_form) {
    const key = normalizeFilename(`${parent_sku}-${variant.delivery_form}`);
    const hit = lookupExact(key, bucket_keys_index);
    if (hit) candidates.push({ full_path: hit.full_path, priority: 4, source: 'variant_form' });
  }

  // Priority 5: Levenshtein <= 2 fallback. Only attempted when no priority-1..4 hit.
  if (!candidates.length && targetSku) {
    const target = normalizeFilename(targetSku);
    let best: { full_path: string; distance: number; obj: BucketObject } | null = null;
    for (const obj of bucket_objects) {
      const key = normalizePathToKey(obj.full_path);
      const d = levenshteinDistance(target, key, 2);
      if (d <= 2) {
        if (!best || d < best.distance) best = { full_path: obj.full_path, distance: d, obj };
      }
    }
    if (best) {
      candidates.push({ full_path: best.full_path, priority: 5, source: `fuzzy_lev=${best.distance}`, distance: best.distance });
    }
  }

  // Add up to 4 runners-up for transparency.
  const runners: MatchCandidate[] = [];
  if (candidates.length > 0 && candidates[0].priority <= 4) {
    // Look for other priority-3 / priority-2 candidates the chooser passed over.
    if (product.slug) {
      const k = normalizeFilename(product.slug);
      const hit = lookupExact(k, bucket_keys_index);
      if (hit && hit.full_path !== candidates[0].full_path) {
        runners.push({ full_path: hit.full_path, priority: 2, source: 'slug_exact' });
      }
    }
    if (product.category && targetSku) {
      const k = normalizeFilename(`${product.category}/${targetSku}`);
      const hit = lookupExact(k, bucket_keys_index);
      if (hit && hit.full_path !== candidates[0].full_path) {
        runners.push({ full_path: hit.full_path, priority: 3, source: 'category_sku' });
      }
    }
  }

  const chosen = candidates[0] ?? null;
  const confidence: MatchConfidence = chosen == null
    ? 'NONE'
    : chosen.priority <= 4 ? 'HIGH' : 'LOW';

  return { chosen, confidence, candidates: [...candidates, ...runners] };
}
