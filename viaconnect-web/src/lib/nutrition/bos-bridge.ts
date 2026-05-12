// Prompt #160 section 7: BOS engine integration point.
//
// After a successful confirm on /api/nutrition/confirm, the route handler
// should call recomputeNutritionDimension to trigger the Bio Optimization
// Score recompute for the nutrition dimension on the affected day.
//
// TODO(#160 follow-up): wire to the actual BOS engine entry point. The
// repo contains lib/scoring/bio-optimization-score.ts but no
// recomputeNutritionDimension export yet; this stub records the call so
// the integration point is visible during code review and the BOS team
// can replace the body with the live call without touching the route
// handlers.

interface RecomputeArgs {
  readonly userId: string;
  readonly date: string;
}

export async function recomputeNutritionDimension(args: RecomputeArgs): Promise<void> {
  // TODO(#160 follow-up): replace with live BOS engine call.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[bos-bridge] recomputeNutritionDimension queued', JSON.stringify(args));
  }
}
