/**
 * Peptide search matching: prefix / word-start only.
 * Mid-word hits are rejected (e.g. "reta" must not match "Secretagogues").
 */

/** Lowercase and strip spaces/hyphens/underscores for hyphenless prefixes (bpc157). */
export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * True when query matches the start of the string or the start of any word.
 * Examples:
 *   "reta"  -> Retatrutide (yes), Secretagogues (no)
 *   "bpc"   -> BPC-157 (yes)
 *   "bpc157"-> BPC-157 via normalized prefix (yes)
 *   "axis"  -> "GH Axis and Secretagogues" (yes, word start)
 */
export function matchesSearchPrefix(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = String(haystack ?? '');
  if (!text) return false;

  const lower = text.toLowerCase();
  if (lower.startsWith(q)) return true;

  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(q))) return true;

  const qNorm = normalizeSearch(q);
  if (!qNorm) return true;
  if (normalizeSearch(lower).startsWith(qNorm)) return true;
  return words.some((word) => normalizeSearch(word).startsWith(qNorm));
}
