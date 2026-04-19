// Prompt #94 Phase 5: Behavioral refinement decision rule.
//
// Pure decision logic for the periodic archetype-refinement tick.
// Avoids "thrashing" a user's primary archetype on tiny score wobbles by
// requiring a meaningful confidence gap before the refined run is allowed
// to overwrite the existing primary.

export const REFINEMENT_CONFIDENCE_GAP = 0.15;

export interface RefinementDecisionInput {
  currentPrimaryId: string;
  currentConfidence: number;
  refinedPrimaryId: string;
  refinedScore: number;
  refinedRunnerUpScore: number;
}

export interface RefinementDecision {
  update: boolean;
  reason: string;
  gap: number;
}

export function shouldUpdatePrimaryArchetype(
  input: RefinementDecisionInput,
): RefinementDecision {
  const gap = Number((input.refinedScore - input.refinedRunnerUpScore).toFixed(3));

  if (input.refinedPrimaryId === input.currentPrimaryId) {
    return {
      update: false,
      reason: 'Refined primary is the same as current primary; no change.',
      gap,
    };
  }

  if (gap <= REFINEMENT_CONFIDENCE_GAP) {
    return {
      update: false,
      reason: `Confidence gap ${gap} is at or below threshold ${REFINEMENT_CONFIDENCE_GAP}.`,
      gap,
    };
  }

  return {
    update: true,
    reason: `Confidence gap ${gap} exceeds threshold ${REFINEMENT_CONFIDENCE_GAP}; refined primary takes over.`,
    gap,
  };
}
