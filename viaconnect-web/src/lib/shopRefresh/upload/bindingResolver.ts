// Prompt #106 §6.1 — filename → SKU binding resolver.
//
// Pure matcher: given a parsed canonical object path and a list of
// candidate master_skus rows for the target category, returns the single
// match (if unique), null (no match), or 'ambiguous' (>1 match).

import type { InScopeCategorySlug } from '../types';
import { slugifyForPath } from './canonicalNaming';

export interface MasterSkuLite {
  sku: string;
  name: string;
}

export type BindingMatch =
  | { kind: 'unique'; sku: string }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'none' };

export function resolveBinding(args: {
  parsedSkuSlug: string;
  candidates: readonly MasterSkuLite[];
}): BindingMatch {
  const target = args.parsedSkuSlug;
  const matches = new Set<string>();
  for (const c of args.candidates) {
    // Primary match: slugify(sku) — e.g., MTHFR+™ → mthfr-plus.
    if (slugifyForPath(c.sku) === target) matches.add(c.sku);
    // Secondary match: slugify(name) for longer canonical names.
    if (slugifyForPath(c.name) === target) matches.add(c.sku);
  }
  const arr = Array.from(matches);
  if (arr.length === 1) return { kind: 'unique', sku: arr[0]! };
  if (arr.length === 0) return { kind: 'none' };
  return { kind: 'ambiguous', candidates: arr };
}

/**
 * Placeholder URL builder — §7.2. Placeholders are only safe for gap-fill
 * rows with active=FALSE. Activation is blocked if image_url points here.
 */
export function placeholderObjectPath(slug: InScopeCategorySlug): string {
  return `placeholders/${slug}-placeholder.png`;
}

export function isPlaceholderImageUrl(url: string): boolean {
  return url.includes('/supplement-photos/placeholders/');
}
