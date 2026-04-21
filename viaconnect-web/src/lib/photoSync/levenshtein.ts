// Two-row Levenshtein distance with an optional early-exit cap.
// Used by the priority-5 fuzzy fallback (cap = 2).

export function levenshteinDistance(a: string, b: string, cap?: number): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  if (cap != null && Math.abs(m - n) > cap) return cap + 1;

  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,         // insertion
        prev[j] + 1,             // deletion
        prev[j - 1] + cost,      // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (cap != null && rowMin > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
