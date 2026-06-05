// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing engine types.
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

export interface TimingRecommendInput {
  ingredients: ReadonlyArray<TimingIngredientInput>;
  frequency: Frequency;
  /**
   * Other supplements the user already takes. Names only; the engine
   * uses these for spacing conflicts (iron with calcium, calcium with
   * iron, magnesium late with iron).
   */
  userSupplements?: ReadonlyArray<{ name: string; time_of_day?: ReadonlyArray<TimeOfDay> | null }>;
}

export interface TimingRecommendation {
  times: ReadonlyArray<TimeOfDay>;
  with_food: boolean;
  /**
   * One short plain-language sentence the user sees. PHI-free.
   * Example: "B-complex is stimulating, best taken in the morning."
   */
  reason: string;
  /**
   * Detected timing-class for the dominant ingredient(s). Surfaced for
   * tests + telemetry; not user-facing.
   */
  detectedClass: TimingClass;
  /**
   * Flags surfaced when the recommendation collides with another
   * supplement the user takes (iron + calcium, iron + coffee/tea, etc.).
   * Surfaced to the UI so the interaction-engine warning is consistent.
   */
  conflicts: ReadonlyArray<string>;
}
