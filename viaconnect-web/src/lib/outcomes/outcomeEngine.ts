// Prompt 208a Module H (Task H2): outcome engine.
//
// Responsibilities:
//   - Capture per-user outcomes and adverse events (fail-open inserts).
//   - Compute AGGREGATE-ONLY, NON-CAUSAL cohort signals with a minimum-cohort
//     privacy floor (MIN_COHORT_N=20). Signals below the floor are NEVER
//     surfaced or persisted.
//   - Rank active-learning topics (pure, deterministic, no mutation).
//
// CAUSAL-CLAIM PROHIBITION: cohort signals are observational correlations
// derived from aggregate deltas. They do not establish causation. n is always
// disclosed. Signal text must never claim a causal relationship.
//
// ADVERSE-EVENT RULE: recordAdverseEvent RECORDS ONLY for human safety review.
// It does NOT auto-disable a rule. The manual rule_killswitch is the sole lever
// for disabling rules.
//
// No em/en-dashes, no emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum cohort size required before a signal may be persisted or surfaced.
 * Below this value the signal is always 'insufficient' and must not be shown
 * to any user or stored in cohort_signals.
 */
export const MIN_COHORT_N = 20;

// ---------------------------------------------------------------------------
// recordOutcome
// ---------------------------------------------------------------------------

/**
 * Insert one outcome_events row for the given user. Fail-open: logs errors and
 * returns false rather than throwing. Never propagates exceptions to callers.
 */
export async function recordOutcome(
  userId: string,
  input: {
    protocolRef?: string;
    adherence?: number;
    subjectiveOutcome?: string;
  },
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const row: Record<string, unknown> = {
      user_id: userId,
    };
    if (input.protocolRef !== undefined) row['protocol_ref'] = input.protocolRef;
    if (input.adherence !== undefined) row['adherence'] = input.adherence;
    if (input.subjectiveOutcome !== undefined) row['subjective_outcome'] = input.subjectiveOutcome;

    const { error } = await supabase.from('outcome_events').insert(row);
    if (error) {
      safeLog.error('outcomeEngine.recordOutcome', 'DB insert error', {
        userId,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    safeLog.error('outcomeEngine.recordOutcome', 'insert threw', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// recordAdverseEvent
// ---------------------------------------------------------------------------

/**
 * Insert one adverse_events row for the given user. Fail-open.
 *
 * IMPORTANT: This function only RECORDS the event for human safety review.
 * It does NOT auto-disable any rule. The manual rule_killswitch is the
 * only supported lever for disabling rules.
 */
export async function recordAdverseEvent(
  userId: string,
  input: {
    itemRef?: string;
    description?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
    implicatedRuleId?: string;
  },
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const row: Record<string, unknown> = {
      user_id: userId,
    };
    if (input.itemRef !== undefined) row['item_ref'] = input.itemRef;
    if (input.description !== undefined) row['description'] = input.description;
    if (input.severity !== undefined) row['severity'] = input.severity;
    if (input.implicatedRuleId !== undefined) row['implicated_rule_id'] = input.implicatedRuleId;

    const { error } = await supabase.from('adverse_events').insert(row);
    if (error) {
      safeLog.error('outcomeEngine.recordAdverseEvent', 'DB insert error', {
        userId,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    safeLog.error('outcomeEngine.recordAdverseEvent', 'insert threw', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// CohortSignal type + aggregateCohortSignal (pure)
// ---------------------------------------------------------------------------

export interface CohortSignal {
  /** Number of observations in the cohort. Always disclosed. */
  n: number;
  /**
   * Mean delta across the cohort, or null when n === 0. This is an
   * observational aggregate -- NOT a causal effect estimate.
   */
  aggregateDelta: number | null;
  /**
   * 'insufficient' when n < MIN_COHORT_N (must not be surfaced or persisted).
   * Otherwise banded by absolute mean magnitude and cohort size.
   */
  signalStrength: 'insufficient' | 'weak' | 'moderate' | 'strong';
}

/**
 * Pure, non-causal aggregate of a numeric delta series.
 *
 * OBSERVATIONAL ONLY: the returned signal summarises a correlation between
 * a protocol and measured deltas in a cohort. It does NOT imply causation.
 * n is always included in the result so callers can disclose it to users.
 *
 * Signal banding (applied only when n >= MIN_COHORT_N):
 *   strong   : |mean| >= 5  AND n >= 50
 *   moderate : |mean| >= 2  OR  n >= 100
 *   weak     : otherwise
 */
export function aggregateCohortSignal(deltas: number[]): CohortSignal {
  const n = deltas.length;

  if (n === 0) {
    return { n: 0, aggregateDelta: null, signalStrength: 'insufficient' };
  }

  const sum = deltas.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  if (n < MIN_COHORT_N) {
    return { n, aggregateDelta: mean, signalStrength: 'insufficient' };
  }

  const absMean = Math.abs(mean);
  let signalStrength: CohortSignal['signalStrength'];
  if (absMean >= 5 && n >= 50) {
    signalStrength = 'strong';
  } else if (absMean >= 2 || n >= 100) {
    signalStrength = 'moderate';
  } else {
    signalStrength = 'weak';
  }

  return { n, aggregateDelta: mean, signalStrength };
}

// ---------------------------------------------------------------------------
// persistCohortSignal
// ---------------------------------------------------------------------------

/**
 * Aggregate the deltas, then persist to cohort_signals ONLY when the signal
 * is not 'insufficient' (i.e. n >= MIN_COHORT_N). Always returns the computed
 * CohortSignal regardless of DB outcome (fail-open).
 *
 * Callers must not surface the returned signal when signalStrength is
 * 'insufficient'.
 */
export async function persistCohortSignal(
  protocolRef: string,
  biomarker: string,
  deltas: number[],
): Promise<CohortSignal> {
  const signal = aggregateCohortSignal(deltas);

  if (signal.signalStrength === 'insufficient') {
    // Privacy floor: do not persist or surface cohorts smaller than MIN_COHORT_N.
    return signal;
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('cohort_signals').insert({
      protocol_ref: protocolRef,
      biomarker,
      aggregate_delta: signal.aggregateDelta,
      n: signal.n,
      signal_strength: signal.signalStrength,
    });
    if (error) {
      safeLog.error('outcomeEngine.persistCohortSignal', 'DB insert error', {
        protocolRef,
        biomarker,
        n: signal.n,
        error: error.message,
      });
    }
  } catch (err) {
    safeLog.error('outcomeEngine.persistCohortSignal', 'insert threw', {
      protocolRef,
      biomarker,
      n: signal.n,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fail-open: return the computed signal even when the DB write failed.
  return signal;
}

// ---------------------------------------------------------------------------
// LearningTopic + prioritizeActiveLearning (pure)
// ---------------------------------------------------------------------------

export interface LearningTopic {
  topic: string;
  /** Number of times this topic has been asked about. */
  askCount: number;
  /** Fraction [0, 1] representing how well the KB already covers the topic. */
  coverage: number;
  /** Average model confidence [0, 1] on answers about this topic. */
  avgConfidence: number;
}

/**
 * Pure ranking of active-learning topics by priority.
 *
 * Score = askCount * (1 - coverage) * (1 - avgConfidence)
 *
 * Higher score = higher priority. Topics with high ask volume, low coverage,
 * and low model confidence rank first. Returns a new array; does not mutate
 * the input.
 */
export function prioritizeActiveLearning(topics: LearningTopic[]): LearningTopic[] {
  const score = (t: LearningTopic): number =>
    t.askCount * (1 - t.coverage) * (1 - t.avgConfidence);

  return [...topics].sort((a, b) => score(b) - score(a));
}
