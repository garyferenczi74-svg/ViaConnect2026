// Prompt #169f Section 11.3: informational tier recommendation.
//
// At the end of the CAQ (onboarding assessment) we surface a single,
// NON-BLOCKING recommendation of the membership tier that best fits the
// user's stated goals. The user can still choose any tier; this only
// marks the suggested one as "Recommended for you".
//
// This module is a pure mapping function (no I/O, no React) so it is
// trivially unit-testable. The caller is responsible for reading the
// goals the user selected in CAQ Phase 3 (the WELLNESS_GOALS string
// array, persisted to assessment_results phase "3") and passing them in.

import type { TierId } from '@/types/pricing';

/** Why a tier was recommended. Stable keys the UI can map if needed. */
export type RecommendationReason =
  | 'body_composition' // weight / muscle / aesthetic / body-comp goals
  | 'general_wellness' // wellness goals without a body-comp focus
  | 'evaluating' //       no goals selected yet; just exploring
  | 'household'; //       multiple household members

export interface TierRecommendation {
  tierId: TierId;
  reason: RecommendationReason;
}

export interface RecommendInputs {
  /** The exact goal labels the user selected in CAQ Phase 3
   *  (values from WELLNESS_GOALS, e.g. "Lose Weight"). */
  goals: readonly string[];
  /** Optional household-member count. The CAQ does not currently capture
   *  this, so it is normally undefined; when a future surface supplies a
   *  value greater than 1 we recommend the Platinum+ Family tier. */
  householdMemberCount?: number;
}

// Goals that indicate weight loss, muscle gain, body-composition tracking,
// or aesthetic goals -> Platinum. Matched case-insensitively against the
// WELLNESS_GOALS labels.
const BODY_COMPOSITION_GOALS: readonly string[] = [
  'lose weight',
  'build muscle',
  'athletic performance',
  'anti-aging',
  'skin & hair health',
];

function normalize(goal: string): string {
  return goal.trim().toLowerCase();
}

/**
 * Pure recommendation logic for Section 11.3.
 *
 *   - Body-composition / aesthetic goals      -> platinum
 *   - General wellness goals (no body focus)  -> gold
 *   - No goals selected (just evaluating)     -> free (path to gold)
 *   - Multiple household members              -> platinum_family
 *
 * Household takes precedence: a multi-member household maps to the family
 * tier regardless of the individual goal mix.
 */
export function recommendTier(inputs: RecommendInputs): TierRecommendation {
  if ((inputs.householdMemberCount ?? 0) > 1) {
    return { tierId: 'platinum_family', reason: 'household' };
  }

  const goals = inputs.goals.map(normalize).filter((g) => g.length > 0);

  if (goals.length === 0) {
    return { tierId: 'free', reason: 'evaluating' };
  }

  const hasBodyCompositionGoal = goals.some((g) => BODY_COMPOSITION_GOALS.includes(g));
  if (hasBodyCompositionGoal) {
    return { tierId: 'platinum', reason: 'body_composition' };
  }

  return { tierId: 'gold', reason: 'general_wellness' };
}

/** Client-facing display names for the four tiers (matches DB display_name
 *  for the family tier). Used to fill the locked Section 11.3 string. */
export const TIER_DISPLAY_NAME: Record<TierId, string> = {
  free: 'Free',
  gold: 'Gold',
  platinum: 'Platinum',
  platinum_family: 'Platinum+ Family',
};

/** The locked Section 11.3 string with the recommended tier substituted. */
export function recommendationSentence(tierId: TierId): string {
  return `Based on your goals, ${TIER_DISPLAY_NAME[tierId]} looks like the best fit for you.`;
}
