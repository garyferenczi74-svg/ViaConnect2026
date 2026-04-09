// Sherlock — relevance scorer wrapper.
// Delegates to the existing research-hub/relevance.ts engine without
// replacing it. This file gives Sherlock a named scoring interface so
// activity logs and audit trails can attribute every score to the agent.
//
// Per Prompt #61b decision 4A: WRAP, don't move.

import {
  buildRelevanceContext,
  scoreRelevance,
  type RelevanceContext,
  type RelevanceResult,
} from '@/lib/research-hub/relevance';
import type { ResearchItem } from '@/lib/research-hub/types';

export interface SherlockScoreResult extends RelevanceResult {
  scoredAt: string;
  scoredBy: 'sherlock';
}

/** Score a single item. */
export function sherlockScore(
  item: ResearchItem,
  context: RelevanceContext,
): SherlockScoreResult {
  const result = scoreRelevance(item, context);
  return {
    ...result,
    scoredAt: new Date().toISOString(),
    scoredBy: 'sherlock',
  };
}

/** Score a batch of items. Returns items paired with their scores. */
export function sherlockBatchScore(
  items: ResearchItem[],
  context: RelevanceContext,
): Array<{ item: ResearchItem; result: SherlockScoreResult }> {
  return items.map((item) => ({ item, result: sherlockScore(item, context) }));
}

/** Re-export for callers that want the context builder. */
export { buildRelevanceContext };
export type { RelevanceContext };
