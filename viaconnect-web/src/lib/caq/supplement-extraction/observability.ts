// =============================================================================
// Prompt 175 Part F (2026-06-04): observability writer.
//
// Persists one row per extraction attempt the router served. Sherlock + the
// 158 analytics framework consume this to track match rate, escalation
// rate, and latency over time. Writes are best-effort: a logging failure
// must NEVER block the extraction response.
// =============================================================================

import { safeLog } from '@/lib/utils/safe-log';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TierAttempt } from './types';

export interface LogExtractionInput {
  userId: string;
  finalAttempt: TierAttempt;
  escalated: boolean;
  matchedCount: number;
}

/**
 * Insert a single observability row for the served attempt. Uses the
 * admin client passed in by the route (service-role bypasses the
 * owner-select-only RLS). Any error is swallowed after a safeLog warn so
 * the extraction response stays unblocked.
 */
export async function logExtractionAttempt(
  input: LogExtractionInput,
  admin: SupabaseClient,
): Promise<void> {
  try {
    const avgConf = Number.isFinite(input.finalAttempt.avgConfidence)
      ? Math.max(0, Math.min(1, input.finalAttempt.avgConfidence))
      : 0;
    const itemCount = Math.max(0, input.finalAttempt.itemCount);
    const matched = Math.max(0, Math.min(itemCount, input.matchedCount));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('caq_supplement_extraction_log')
      .insert({
        user_id: input.userId,
        model_tier: input.finalAttempt.tier,
        escalated: input.escalated,
        item_count: itemCount,
        matched_count: matched,
        avg_confidence: avgConf,
        latency_ms: Math.max(0, Math.round(input.finalAttempt.latencyMs)),
        outcome_code: input.finalAttempt.outcomeCode,
      });
    if (error) {
      safeLog.warn('caq.supplement-extraction.observability', 'insert failed', { error });
    }
  } catch (err) {
    safeLog.warn('caq.supplement-extraction.observability', 'insert threw', { error: err });
  }
}
