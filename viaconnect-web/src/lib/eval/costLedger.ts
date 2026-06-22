// src/lib/eval/costLedger.ts
//
// Per-pass cost ledger for the autonomous research loop.
// Records estimated token and API-call costs to the cost_ledger table
// and emits a BudgetState signal for backpressure / alerting.
//
// FAIL-OPEN: recordPassCost never throws. A cost-recording failure must
// never break the cron or research pass that calls it.
//
// Prompt 208a, Module L, Task L4 (2026-06-21).
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Types and constants
// ---------------------------------------------------------------------------

export type BudgetState = 'ok' | 'approaching' | 'over'

/** Default per-pass USD budget for a solo operator. Configurable via arg. */
export const DEFAULT_PASS_BUDGET = 0.5

// ---------------------------------------------------------------------------
// Pure helper: compute budget state from cost vs. budget
// ---------------------------------------------------------------------------

/**
 * Compute the BudgetState for a given estimated cost against a budget.
 *
 *   budget <= 0           -> 'ok'  (unbounded; guard disabled)
 *   estimatedCost >= budget      -> 'over'
 *   estimatedCost >= 0.8 * budget -> 'approaching'
 *   otherwise                    -> 'ok'
 */
export function budgetState(estimatedCost: number, budget: number): BudgetState {
  if (budget <= 0) return 'ok'
  if (estimatedCost >= budget) return 'over'
  if (estimatedCost > 0.8 * budget) return 'approaching'
  return 'ok'
}

// ---------------------------------------------------------------------------
// recordPassCost
// ---------------------------------------------------------------------------

/**
 * Record estimated cost for a research pass to the cost_ledger table and
 * return the BudgetState. Emits safeLog.warn when state is 'approaching'
 * or 'over' as the backpressure/alert signal.
 *
 * FAIL-OPEN: any DB error or thrown exception is logged via safeLog.error
 * and the computed state is still returned. This function never throws.
 */
export async function recordPassCost(input: {
  passRef: string
  tokens: number
  apiCalls: number
  estimatedCost: number
  budget?: number
}): Promise<BudgetState> {
  const budget = input.budget ?? DEFAULT_PASS_BUDGET
  const state = budgetState(input.estimatedCost, budget)

  if (state === 'approaching' || state === 'over') {
    safeLog.warn('cost-ledger', `Budget ${state} for pass`, {
      passRef: input.passRef,
      estimatedCost: input.estimatedCost,
      budget,
      state,
    })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('cost_ledger').insert([
      {
        pass_ref: input.passRef,
        tokens: input.tokens,
        api_calls: input.apiCalls,
        estimated_cost: input.estimatedCost,
        budget_state: state,
      },
    ])

    if (error) {
      safeLog.error('cost-ledger', 'Failed to insert cost_ledger row', {
        passRef: input.passRef,
        error: error.message,
        state,
      })
    }
  } catch (err) {
    safeLog.error('cost-ledger', 'Unexpected error in recordPassCost', {
      passRef: input.passRef,
      error: err instanceof Error ? err.message : String(err),
      state,
    })
  }

  return state
}
