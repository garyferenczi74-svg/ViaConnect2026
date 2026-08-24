// Brief 17: empty observed marker counts are "Not analyzed", never the
// number 0. Do not rename PR 32 / Brief 16 Demo or Unanalyzed chips.
// This helper is only for empty catalog counts on Brief 17 surfaces.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

export const NOT_ANALYZED_LABEL = 'Not analyzed';

/**
 * Label for an empty or missing marker count. A real positive count stays
 * numeric. Null, undefined, and 0 never render as the number 0.
 */
export function emptyMarkerCountLabel(
  count: number | null | undefined,
): string {
  if (count === null || count === undefined || count <= 0) {
    return NOT_ANALYZED_LABEL;
  }
  return String(count);
}

export function isEmptyMarkerCount(
  count: number | null | undefined,
): boolean {
  return count === null || count === undefined || count <= 0;
}
