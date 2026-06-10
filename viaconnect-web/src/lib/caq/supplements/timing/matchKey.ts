// =============================================================================
// Prompt 185a slice 3 (2026-06-09): map a supplement ingredient name to a
// supplement_timing_rules.match_key. Finer grained than the engine's five
// TimingClass buckets; aligns with the 14 seeded ingredient-slug keys in
// 20260609150000_prompt_185a_seed_timing_rules.sql. Case-insensitive substring
// match, first key whose pattern hits wins.
//
// Key order encodes precedence for an ambiguous single name (for example a
// "calcium ascorbate" reads as calcium, not vitamin_c). For a multi-ingredient
// supplement, matchRuleKeyForIngredients scans the ingredient list in order
// and returns the first matched key (the primary active is listed first).
//
// PHI-free. Product / ingredient names only. No emojis. No em or en dashes.
// =============================================================================

const MATCH_KEY_PATTERNS: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  ['iron', ['ferrous', 'iron bisglycinate', 'iron glycinate', 'iron citrate', 'ferritin', 'heme iron', 'iron polysaccharide', 'carbonyl iron', 'iron']],
  ['magnesium_glycinate', ['magnesium glycinate', 'magnesium bisglycinate', 'magnesium threonate', 'magnesium l-threonate', 'magnesium taurate', 'magnesium']],
  ['calcium', ['calcium carbonate', 'calcium citrate', 'calcium malate', 'calcium ascorbate', 'calcium']],
  ['zinc', ['zinc bisglycinate', 'zinc picolinate', 'zinc gluconate', 'zinc citrate', 'zinc']],
  ['melatonin', ['melatonin']],
  ['ashwagandha', ['ashwagandha', 'withania']],
  ['l_theanine', ['l-theanine', 'theanine']],
  ['glycine', ['glycine', 'l-glycine']],
  ['vitamin_d3', ['vitamin d3', 'vitamin d', 'cholecalciferol', 'd3']],
  ['coq10', ['coq10', 'ubiquinol', 'ubiquinone', 'coenzyme q10']],
  ['omega_3', ['omega 3', 'omega-3', 'fish oil', 'cod liver oil', 'krill oil', 'algae oil', 'epa', 'dha']],
  ['vitamin_c', ['vitamin c', 'ascorbic acid', 'sodium ascorbate', 'ascorbate']],
  ['b_complex', ['b-complex', 'b complex', 'b12', 'cobalamin', 'methylcobalamin', 'b6', 'pyridoxine', 'b3', 'niacin', 'niacinamide', 'b2', 'riboflavin', 'b1', 'thiamine', 'thiamin', 'methylfolate', 'folate', 'folic acid', '5-mthf']],
  ['probiotic', ['probiotic', 'lactobacillus', 'bifidobacterium', 'saccharomyces']],
];

/**
 * Map a single ingredient name to a knowledge-base match_key, or null when no
 * pattern matches (the engine then falls back to class inference).
 */
export function matchRuleKey(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [key, patterns] of MATCH_KEY_PATTERNS) {
    for (const p of patterns) {
      if (lower.includes(p)) return key;
    }
  }
  return null;
}

/**
 * Map a supplement's ingredient list to a single match_key by primary active:
 * the first ingredient (in list order) that resolves to a key wins. Returns
 * null when none of the ingredients match a known key.
 */
export function matchRuleKeyForIngredients(names: ReadonlyArray<string>): string | null {
  for (const n of names) {
    const key = matchRuleKey(n);
    if (key) return key;
  }
  return null;
}
