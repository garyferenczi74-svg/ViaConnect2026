// Prompt 172 Phase 2 (172b): BosLine view model.
//
// 172b promotes the Phase 1A placeholder to the production shape per spec
// section 3 + section 5.2 v3.
//
// Kind axis (strictly Bio Optimization analytics; no clinical, no
// prescriptive, no genetics, no bioavailability per spec section 3
// "Reserved for future prompts"):
//   positive_delta   the meal moved the Bio Optimization score above the
//                    noise band in a positive direction.
//   neutral          the meal sat inside the noise band, no meaningful
//                    score movement.
//   gentle_caution   the meal moved the Bio Optimization score below the
//                    noise band in a negative direction.
//   learning         insufficient analytics history to read a signal yet
//                    (fewer than two persisted BOS rows).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

export type BosLineKind =
  | 'positive_delta'
  | 'neutral'
  | 'gentle_caution'
  | 'learning';

export interface BosLine {
  /** Strict Bio Optimization analytics kind discriminator. */
  kind: BosLineKind;
  /** Resolved microcopy line, rendered inside the MealCard BOS slot. */
  copy: string;
  /** Meal that this line was resolved against (mirrors path param). */
  mealId: string;
  /** ISO 8601 timestamp the line was resolved at. */
  generatedAt: string;
}
