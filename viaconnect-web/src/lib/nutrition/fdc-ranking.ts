// Prompt 186 Phase 2: deterministic FDC search-candidate ranking. Replaces
// the first-hit selection that matched "avocado" to "Oil, avocado" and
// "apple" to "Croissants, apple" in production (E1 in the 186 work log).
//
// Pure module: no I/O, fully unit testable. Scoring is intentionally simple
// and explainable; every weight is named. The winner plus its score and the
// rejected head of the raw list are surfaced so the structured item log can
// show WHY a reference was chosen.

export interface FdcSearchCandidate {
  fdcId: number;
  description: string;
  dataType?: string;
}

export interface RankedCandidate<T extends FdcSearchCandidate> {
  candidate: T;
  score: number;
}

// Tokens that signal the candidate is a transformed or different food than
// the plain query (concentrates, extractions, baked goods, parts). Penalized
// only when the token is NOT in the user's query, so "avocado oil" still
// matches "Oil, avocado" and "white rice" is not penalized for "white".
const TRANSFORM_TOKENS = new Set([
  'oil', 'powder', 'powdered', 'dried', 'dehydrated', 'flour', 'juice',
  'candied', 'candy', 'candies', 'syrup', 'sauce', 'dressing', 'gravy',
  'chip', 'chips', 'cracker', 'crackers', 'cereal', 'bar', 'bars',
  'babyfood', 'beverage', 'cocktail', 'smoothie', 'croissant', 'croissants',
  'cake', 'pie', 'cobbler', 'crisp', 'muffin', 'muffins', 'cookie',
  'cookies', 'pudding', 'jam', 'jelly', 'topping', 'spread', 'imitation',
  'substitute', 'mix', 'instant', 'concentrate', 'evaporated', 'condensed',
  'white', 'yolk', 'shell', 'dry', 'cider', 'wine', 'vinegar', 'extract',
  'seasoning', 'soup', 'salad', 'casserole', 'sweetened', 'glazed',
]);

// Plain-state tokens that make a candidate a better default reference when
// the user gave no preparation.
const PLAIN_TOKENS = new Set(['raw', 'fresh', 'whole', 'plain']);

const COOKING_TOKENS = new Set([
  'boiled', 'poached', 'scrambled', 'fried', 'cooked', 'baked', 'grilled',
  'roasted', 'steamed', 'braised', 'broiled', 'toasted', 'hard-boiled',
  'hardboiled', 'stewed',
]);

const WEIGHTS = {
  firstTokenMatch: 2,
  allQueryTokensPresent: 2,
  missingQueryToken: -6,
  transformToken: -3,
  plainToken: 0.75,
  preparationMatch: 2,
  wrongPreparation: -1.5,
  unrequestedCooking: -0.5,
  noiseToken: -0.25,
  exactMatch: 3,
} as const;

const DATA_TYPE_BONUS: Record<string, number> = {
  Foundation: 1.25,
  'SR Legacy': 1.0,
  'Survey (FNDDS)': 0.75,
  Branded: 0.25,
};

function singularize(token: string): string {
  if (token.length <= 2) return token;
  if (/(ses|xes|zes|ches|shes|oes)$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokenizeFoodText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
    .map(singularize);
}

export function scoreCandidate(
  queryTokens: string[],
  preparationTokens: string[],
  candidate: FdcSearchCandidate,
): number {
  const descTokens = tokenizeFoodText(candidate.description);
  const descSet = new Set(descTokens);
  const querySet = new Set(queryTokens);
  const prepSet = new Set(preparationTokens);

  let score = 0;

  const missing = queryTokens.filter((t) => !descSet.has(t));
  if (missing.length === 0) {
    score += WEIGHTS.allQueryTokensPresent;
  } else {
    score += WEIGHTS.missingQueryToken * missing.length;
  }

  if (descTokens.length > 0 && querySet.has(descTokens[0])) {
    score += WEIGHTS.firstTokenMatch;
  }

  if (descTokens.length === queryTokens.length && missing.length === 0) {
    score += WEIGHTS.exactMatch;
  }

  for (const token of descSet) {
    if (querySet.has(token)) continue;
    if (prepSet.has(token)) {
      score += WEIGHTS.preparationMatch;
    } else if (COOKING_TOKENS.has(token)) {
      score += prepSet.size > 0 ? WEIGHTS.wrongPreparation : WEIGHTS.unrequestedCooking;
    } else if (TRANSFORM_TOKENS.has(token)) {
      score += WEIGHTS.transformToken;
    } else if (PLAIN_TOKENS.has(token)) {
      score += prepSet.size > 0 ? WEIGHTS.noiseToken : WEIGHTS.plainToken;
    } else {
      score += WEIGHTS.noiseToken;
    }
  }

  score += DATA_TYPE_BONUS[candidate.dataType ?? ''] ?? 0;

  return Math.round(score * 100) / 100;
}

export interface RankResult<T extends FdcSearchCandidate> {
  best: T | null;
  bestScore: number;
  // Whether the raw first hit differed from the ranked winner; surfaced in
  // the structured item log to quantify how often ranking changes selection.
  firstHitOverridden: boolean;
  ranked: Array<RankedCandidate<T>>;
}

// A winner must at minimum contain every query token. Anything less is a
// miss: the caller falls back to the AI estimator rather than logging a
// wrong reference food (garbage references are worse than estimates).
const MIN_ACCEPT_SCORE = WEIGHTS.allQueryTokensPresent;

export function rankFdcCandidates<T extends FdcSearchCandidate>(
  query: string,
  preparation: string | undefined,
  candidates: T[],
): RankResult<T> {
  const queryTokens = tokenizeFoodText(query);
  const preparationTokens = preparation ? tokenizeFoodText(preparation) : [];

  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(queryTokens, preparationTokens, candidate) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < MIN_ACCEPT_SCORE) {
    return { best: null, bestScore: top?.score ?? 0, firstHitOverridden: false, ranked };
  }
  return {
    best: top.candidate,
    bestScore: top.score,
    firstHitOverridden: candidates.length > 0 && candidates[0].fdcId !== top.candidate.fdcId,
    ranked,
  };
}
