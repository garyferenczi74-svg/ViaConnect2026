// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing engine types.
// Prompt 185a slice 3 (2026-06-09): added the Layer 1 knowledge-base rule input,
// the Layer 2 CAQ signal input, and richer recommendation output (constraint
// chips + the matched match_key). Additive: callers that pass only
// ingredients/frequency keep working and read the same fields as before.
// =============================================================================

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type Frequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_daily'
  | 'weekly'
  | 'as_needed';

export type TimingClass =
  | 'stimulating'
  | 'calming'
  | 'fat_soluble'
  | 'iron'
  | 'general';

export interface TimingIngredientInput {
  name: string;
  amount?: number | null;
  unit?: string | null;
  form?: string | null;
}

/**
 * Prompt 185a slice 3 (Layer 1): one supplement_timing_rules row (Hannah's
 * knowledge base), matched to a supplement by match_key. PHI-free reference
 * data, shaped to the seed migration columns.
 */
export interface TimingRule {
  match_key: string;
  default_time_of_day: TimeOfDay;
  with_food: boolean | null;
  empty_stomach: boolean | null;
  fat_soluble: boolean;
  away_from: ReadonlyArray<string>;
  rationale_short: string;
}

/**
 * Prompt 185a slice 3 (Layer 2): the user's CAQ-derived timing signals. All
 * optional; the engine only adjusts for the ones present.
 */
export interface CaqTimingSignals {
  // Reports trouble falling or staying asleep (CAQ health concern / symptom).
  sleepDifficulty?: boolean;
  // Reports low energy or fatigue.
  lowEnergy?: boolean;
  // Heavy caffeine intake, treated as morning caffeine for iron spacing.
  highMorningCaffeine?: boolean;
  // The bucket the user's largest meal lands in, for with-food alignment.
  largestMealWindow?: TimeOfDay | null;
}

export interface TimingRecommendInput {
  ingredients: ReadonlyArray<TimingIngredientInput>;
  frequency: Frequency;
  /**
   * Other supplements the user already takes. Names only; the engine
   * uses these for spacing conflicts (iron with calcium, calcium with
   * iron, magnesium late with iron).
   */
  userSupplements?: ReadonlyArray<{ name: string; time_of_day?: ReadonlyArray<TimeOfDay> | null }>;
  /**
   * Prompt 185a slice 3 (Layer 1): the knowledge-base rule matched by the
   * caller after a supplement_timing_rules lookup. Present seeds the bucket
   * and constraint flags; absent falls back to the in-code class inference.
   */
  matchedRule?: TimingRule | null;
  /**
   * Prompt 185a slice 3 (Layer 2): CAQ-derived signals. Present refines the
   * base recommendation; absent leaves it unchanged.
   */
  caqSignals?: CaqTimingSignals | null;
}

export interface TimingRecommendation {
  times: ReadonlyArray<TimeOfDay>;
  with_food: boolean;
  /**
   * Prompt 185a slice 3: constraint chips for the schedule card. empty_stomach
   * and away_from come from the matched rule (or class inference when
   * unmatched); fat_soluble mirrors the rule or the detected class.
   */
  empty_stomach: boolean;
  fat_soluble: boolean;
  away_from: ReadonlyArray<string>;
  /**
   * One short plain-language sentence the user sees. PHI-free.
   */
  reason: string;
  /**
   * Detected timing-class for the dominant ingredient(s). Surfaced for
   * tests + telemetry; not user-facing.
   */
  detectedClass: TimingClass;
  /**
   * Prompt 185a slice 3: the supplement_timing_rules.match_key this
   * recommendation was seeded from, or null when no rule matched (the caller
   * logs the unmatched key for catalog enrichment).
   */
  match_key: string | null;
  /**
   * Flags surfaced when the recommendation collides with another supplement
   * the user takes (iron + calcium, iron + coffee/tea, etc.).
   */
  conflicts: ReadonlyArray<string>;
}
