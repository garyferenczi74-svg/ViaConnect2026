// Prompt 172 Phase 2 (172b): nutrition Bio Optimization Score bridge.
//
// This module bridges the nutrition pipeline to the Bio Optimization Score
// engine. It has two responsibilities:
//
//   1. recomputeNutritionDimension(args): fire and forget hook called by the
//      save flow (meals + hydration routes) so the score engine refreshes
//      the nutrition dimension on the affected day. The Phase 2 body still
//      logs in development and is a noop in production; the live BOS engine
//      wires via the daily worker (bos_compute_queue) outside this call
//      site. Removing the call would silently drop the hook every existing
//      route consumes (meals POST, hydration PUT, hydration DELETE, etc).
//
//   2. resolveBosLine(args): re export of the real resolver under
//      @/lib/nutrition/bos-line/resolver. Consumers that only need the BOS
//      line view model can import from here so the bridge is the single
//      front door to all BOS adjacent nutrition concerns.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

export { resolveBosLine } from '@/lib/nutrition/bos-line/resolver';
export type { ResolveBosLineInput } from '@/lib/nutrition/bos-line/resolver';
export type { BosLine, BosLineKind } from '@/lib/nutrition/bos-line/types';

interface RecomputeArgs {
  readonly userId: string;
  readonly date: string;
}

/**
 * Nutrition dimension BOS recompute hook. The save flow calls this best
 * effort after a successful insert; failures here are logged at the call
 * site and never fail the response. The live recompute is driven by the
 * daily worker drain in @/lib/scoring/bio-optimization-score; this hook
 * exists so that surface can be replaced with an inline trigger without
 * having to touch every nutrition route that already depends on the call.
 */
export async function recomputeNutritionDimension(args: RecomputeArgs): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[bos-bridge] recomputeNutritionDimension queued', JSON.stringify(args));
  }
}
