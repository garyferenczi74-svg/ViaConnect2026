// Prompt 172 Phase 1A: minimal placeholder for the BosLine view model.
//
// 172b (Bio Optimization Score Hook) is the prompt that wires the real BOS
// line resolver via /api/nutrition/bos-line/[mealId]. Until 172b lands, the
// MealCard model carries bosLine: null always.
//
// This file exists so MealCard.types.ts can re-export BosLine | null without
// a missing module error. 172b will replace this shape with the real fields:
// at minimum a kind discriminator + a microcopy line, plus the qualitative
// non prescriptive composition that 170c section 8.4 mandates under the
// silent ratio mode behavioral contract.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

export interface BosLine {
  /** Discriminator the 172b resolver tags the line with (qualitative variant). */
  kind: string;
  /** The microcopy line itself, rendered inside the MealCard slot. */
  copy: string;
}
