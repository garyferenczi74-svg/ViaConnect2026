// Prompt #164 Layer 2: normalize a food name so "Eggs", "egg", "EGGS", "  egg "
// all share the same usda_food_cache row. Naive depluralization is fine for
// the food name domain; words like "fish" survive as "fish" and stay correct.

const ARTICLES = /^(a|an|the)\s+/i;
const PUNCT_TAIL = /[.,;:!?]+$/;
const WS = /\s+/g;

export function normalizeQuery(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.replace(ARTICLES, '');
  s = s.replace(PUNCT_TAIL, '');
  s = s.replace(WS, ' ');
  s = depluralize(s);
  return s;
}

function depluralize(word: string): string {
  if (word.length <= 2) return word;
  if (/(ses|xes|zes|ches|shes|oes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}
