// Fuzzy brand/product matching for supplement cache lookups

export function normalizeBrandName(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/health|products|inc|llc|ltd|co|corp|supplements|nutrition/g, "")
    .trim();
}

export function normalizeProductName(product: string): string {
  return product
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/supplement|formula|complex|blend|advanced|premium|professional|extra strength/g, "")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function isProductMatch(
  inputBrand: string, inputProduct: string,
  cachedBrand: string, cachedProduct: string
): boolean {
  const nb1 = normalizeBrandName(inputBrand);
  const nb2 = normalizeBrandName(cachedBrand);
  const np1 = normalizeProductName(inputProduct);
  const np2 = normalizeProductName(cachedProduct);
  const brandMatch = nb1 === nb2 || levenshteinDistance(nb1, nb2) <= 2;
  const productMatch = np1 === np2 || levenshteinDistance(np1, np2) <= 3;
  return brandMatch && productMatch;
}
