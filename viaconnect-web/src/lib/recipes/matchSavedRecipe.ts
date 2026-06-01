/**
 * Prompt 170f Phase B: recipe match short-circuit logic per spec §7.
 *
 * Levenshtein-based normalized fuzzy match between a logged meal name and
 * the user's saved recipes. Threshold 0.82 (env-tunable
 * RECIPE_SHORT_CIRCUIT_THRESHOLD per Blueprint Issue #4). Recency boost
 * for recipes logged within 14 days raises precision on re-logs.
 *
 * Only the single highest-scoring candidate is proposed. Never propose
 * more than one. False positive (wrong recipe) is worse than false
 * negative (no proposal) because it risks logging incorrect nutrition.
 *
 * NOTE: This library is built but not yet wired into the meal-logging
 * hot path. Wiring is Phase 1.1 (preview-first per spec §18.1).
 */

export interface SavedRecipeCandidate {
  id: string;
  name: string;
  last_logged_at: string | null;
  log_count: number;
}

export interface RecipeMatch {
  recipe_id: string;
  recipe_name: string;
  similarity: number;
  boosted_score: number;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const left = a.toLowerCase().trim();
  const right = b.toLowerCase().trim();
  if (left.length === 0 || right.length === 0) return 0;
  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  return 1 - distance / maxLen;
}

function getThreshold(): number {
  const raw = process.env.RECIPE_SHORT_CIRCUIT_THRESHOLD;
  if (!raw) return 0.82;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 1) return 0.82;
  return parsed;
}

const RECENT_BOOST_DAYS = 14;
const RECENT_BOOST_VALUE = 0.05;

function recencyBoost(lastLoggedAt: string | null): number {
  if (lastLoggedAt === null) return 0;
  const d = new Date(lastLoggedAt);
  if (Number.isNaN(d.getTime())) return 0;
  const ageMs = Date.now() - d.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > RECENT_BOOST_DAYS) return 0;
  return RECENT_BOOST_VALUE;
}

export function matchSavedRecipe(
  inputName: string,
  candidates: SavedRecipeCandidate[],
): RecipeMatch | null {
  if (typeof inputName !== 'string' || inputName.trim().length === 0) return null;
  if (candidates.length === 0) return null;

  const threshold = getThreshold();

  let best: RecipeMatch | null = null;
  for (const cand of candidates) {
    const baseSim = similarity(inputName, cand.name);
    const boosted = Math.min(1, baseSim + recencyBoost(cand.last_logged_at));
    if (boosted < threshold) continue;
    if (best === null || boosted > best.boosted_score) {
      best = {
        recipe_id: cand.id,
        recipe_name: cand.name,
        similarity: Math.round(baseSim * 100) / 100,
        boosted_score: Math.round(boosted * 100) / 100,
      };
    }
  }
  return best;
}
