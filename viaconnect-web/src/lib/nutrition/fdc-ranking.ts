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
// Every comparison set is normalized through tokenizeFoodText so entries can
// never drift from the singularized form description tokens take ("cookies"
// tokenizes to "cooky", "delicious" to "deliciou"; raw literals would
// silently never match). Prompt 186 review fix.
function normalizedTokenSet(items: string[]): Set<string> {
  return new Set(items.flatMap((t) => tokenizeFoodText(t)));
}

const TRANSFORM_TOKENS = normalizedTokenSet([
  'oil', 'powder', 'powdered', 'dried', 'dehydrated', 'flour', 'juice',
  'candied', 'candy', 'candies', 'syrup', 'sauce', 'dressing', 'gravy',
  'chip', 'chips', 'cracker', 'crackers', 'bar', 'bars',
  'babyfood', 'beverage', 'cocktail', 'smoothie', 'croissant', 'croissants',
  'cake', 'pie', 'cobbler', 'crisp', 'muffin', 'muffins', 'cookie',
  'cookies', 'pudding', 'jam', 'jelly', 'topping', 'spread', 'imitation',
  'substitute', 'mix', 'instant', 'concentrate', 'evaporated', 'condensed',
  'white', 'yolk', 'shell', 'dry', 'cider', 'wine', 'vinegar', 'extract',
  'seasoning', 'soup', 'salad', 'casserole', 'sweetened', 'glazed',
]);

// Plain-state tokens that make a candidate a better default reference when
// the user gave no preparation.
const PLAIN_TOKENS = normalizedTokenSet(['raw', 'fresh', 'whole', 'plain']);

// Cultivar and origin tokens: a generic query ("apple") should resolve to
// the generic reference, not a specific sweet varietal (Foundation fuji
// carries 13.3 g sugar per 100 g vs 10.4 generic). Only penalized when the
// user did not ask for the variety.
const VARIETAL_TOKENS = normalizedTokenSet([
  'fuji', 'gala', 'honeycrisp', 'braeburn', 'mcintosh', 'delicious',
  'granny', 'california', 'florida', 'hass', 'navel', 'valencia',
  'russet', 'roma',
]);

const COOKING_TOKENS = normalizedTokenSet([
  'boiled', 'poached', 'scrambled', 'fried', 'cooked', 'baked', 'grilled',
  'roasted', 'steamed', 'braised', 'broiled', 'toasted', 'stewed',
]);

const WEIGHTS = {
  firstTokenMatch: 2,
  allQueryTokensPresent: 2,
  missingQueryToken: -6,
  transformToken: -3,
  varietalToken: -1,
  plainToken: 0.75,
  preparationMatch: 2,
  wrongPreparation: -1.5,
  unrequestedCooking: -0.5,
  noiseToken: -0.25,
  exactMatch: 3,
} as const;

// Analytical composition data beats survey-derived recipe data for plain
// food references: Foundation and SR Legacy are measured; FNDDS is survey
// data with as-consumed portions that skew large for raw whole foods.
const DATA_TYPE_BONUS: Record<string, number> = {
  Foundation: 1.5,
  'SR Legacy': 1.25,
  'Survey (FNDDS)': 0.5,
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

// SR descriptions carry long parentheticals like "(Includes foods for USDA's
// Food Distribution Program)" that would drown a good reference in noise
// penalties. Parenthetical content is dropped EXCEPT tokens the user asked
// for ("Bread, french or vienna (includes sourdough)" keeps "sourdough").
function candidateTokens(description: string, querySet: ReadonlySet<string>): string[] {
  const parens = [...description.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(' ');
  const stripped = description.replace(/\([^)]*\)/g, ' ');
  const tokens = tokenizeFoodText(stripped);
  for (const t of tokenizeFoodText(parens)) {
    if (querySet.has(t)) tokens.push(t);
  }
  return tokens;
}

export function scoreCandidate(
  queryTokens: string[],
  preparationTokens: string[],
  candidate: FdcSearchCandidate,
): number {
  const querySet = new Set(queryTokens);
  const descTokens = candidateTokens(candidate.description, querySet);
  const descSet = new Set(descTokens);
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

  // Preparation handled first: once any requested preparation token matched,
  // other cooking tokens in the same description are noise, not a wrong
  // preparation (FNDDS names combined methods, "boiled or poached").
  const prepMatched = preparationTokens.some((t) => descSet.has(t));

  for (const token of descSet) {
    if (querySet.has(token)) continue;
    if (prepSet.has(token)) {
      score += WEIGHTS.preparationMatch;
    } else if (COOKING_TOKENS.has(token)) {
      score += prepMatched
        ? WEIGHTS.noiseToken
        : prepSet.size > 0
          ? WEIGHTS.wrongPreparation
          : WEIGHTS.unrequestedCooking;
    } else if (TRANSFORM_TOKENS.has(token)) {
      score += WEIGHTS.transformToken;
    } else if (VARIETAL_TOKENS.has(token)) {
      score += WEIGHTS.varietalToken;
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
