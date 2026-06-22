/**
 * src/lib/agents/conflictArbitration.ts
 *
 * Cross-agent conflict arbitration (Prompt 208a Task K2, 2026-06-22).
 *
 * arbitrateConflict: PURE, DETERMINISTIC, SAFETY-FIRST resolver.
 *   - Safety-grounded position wins outright.
 *   - Otherwise: more conservative stance wins (avoid > caution > recommend).
 *     Withholding is the safe default.
 *   - True equipoise (same rank, neither uniquely safety-grounded) -> escalate.
 *   resolvedBy is always 'jeffery'.
 *
 * logAgentConflict: writes one agent_conflict_log row. Fail-open (never throws).
 *
 * No synthesis change. No new dependency. No package.json change.
 * No em/en-dashes. No emojis.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AgentPosition {
  agent: string;
  stance: 'recommend' | 'caution' | 'avoid';
  safetyGrounded?: boolean;
}

export interface AgentConflict {
  topic: string;
  a: AgentPosition;
  b: AgentPosition;
  detail?: string;
}

export interface Arbitration {
  winner: 'a' | 'b' | 'escalate';
  resolvedBy: 'jeffery';
  rationale: string;
}

// ---------------------------------------------------------------------------
// Stance conservatism rank (higher = more conservative = preferred)
// ---------------------------------------------------------------------------

const CONSERVATISM_RANK: Record<AgentPosition['stance'], number> = {
  recommend: 0,
  caution: 1,
  avoid: 2,
};

// ---------------------------------------------------------------------------
// arbitrateConflict (pure, deterministic, no I/O)
// ---------------------------------------------------------------------------

/**
 * Resolve a conflict between two agent positions.
 *
 * Resolution order:
 * 1. If exactly one side is safetyGrounded === true -> that side wins.
 * 2. If both or neither are uniquely safetyGrounded:
 *    a. More conservative stance wins (avoid > caution > recommend).
 *    b. Same conservatism rank -> escalate to human review.
 *
 * resolvedBy is always 'jeffery'.
 */
export function arbitrateConflict(conflict: AgentConflict): Arbitration {
  const { a, b } = conflict;

  const aGrounded = a.safetyGrounded === true;
  const bGrounded = b.safetyGrounded === true;

  // -------------------------------------------------------------------------
  // Rule 1: Unique safety-grounding wins outright.
  // -------------------------------------------------------------------------
  if (aGrounded && !bGrounded) {
    return {
      winner: 'a',
      resolvedBy: 'jeffery',
      rationale: 'safety-grounded published-only result wins: position a is safety-grounded and position b is not',
    };
  }

  if (bGrounded && !aGrounded) {
    return {
      winner: 'b',
      resolvedBy: 'jeffery',
      rationale: 'safety-grounded published-only result wins: position b is safety-grounded and position a is not',
    };
  }

  // -------------------------------------------------------------------------
  // Rule 2: Compare conservatism (both grounded or neither grounded).
  // -------------------------------------------------------------------------
  const rankA = CONSERVATISM_RANK[a.stance];
  const rankB = CONSERVATISM_RANK[b.stance];

  if (rankA > rankB) {
    return {
      winner: 'a',
      resolvedBy: 'jeffery',
      rationale: `conservative stance wins: ${a.stance} (${a.agent}) outranks ${b.stance} (${b.agent}); withholding is the safe default`,
    };
  }

  if (rankB > rankA) {
    return {
      winner: 'b',
      resolvedBy: 'jeffery',
      rationale: `conservative stance wins: ${b.stance} (${b.agent}) outranks ${a.stance} (${a.agent}); withholding is the safe default`,
    };
  }

  // -------------------------------------------------------------------------
  // Rule 3: True equipoise -> escalate to human review.
  // -------------------------------------------------------------------------
  return {
    winner: 'escalate',
    resolvedBy: 'jeffery',
    rationale: `equipoise: both positions have stance "${a.stance}" and no unique safety-grounding; route to human review`,
  };
}

// ---------------------------------------------------------------------------
// logAgentConflict (async, fail-open)
// ---------------------------------------------------------------------------

/**
 * Insert one agent_conflict_log row for a resolved conflict.
 * Fail-open: never throws; returns false on any error.
 *
 * @param userId     The user's UUID or null for system-level conflicts.
 * @param conflict   The original AgentConflict.
 * @param arbitration The resolution from arbitrateConflict.
 * @returns true on successful insert, false on any error.
 */
export async function logAgentConflict(
  userId: string | null,
  conflict: AgentConflict,
  arbitration: Arbitration,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('agent_conflict_log')
      .insert({
        user_id: userId,
        agent_a: conflict.a.agent,
        agent_b: conflict.b.agent,
        topic: conflict.topic,
        conflict_detail: conflict.detail ?? null,
        resolution: arbitration.winner,
        resolved_by: arbitration.resolvedBy,
      });

    if (error) {
      safeLog.warn('conflictArbitration', 'logAgentConflict insert error; fail-open', {
        userId,
        topic: conflict.topic,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (err) {
    safeLog.warn('conflictArbitration', 'logAgentConflict threw; fail-open', {
      userId,
      topic: conflict.topic,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
