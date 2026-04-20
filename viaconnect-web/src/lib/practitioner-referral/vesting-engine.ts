// Prompt #98 Phase 4: Pure vesting engine.
//
// Given a milestone event row's relevant signals (hold_expires_at,
// attribution status, fraud-flag counts), returns one of four
// outcomes the vesting orchestrator acts on:
//   vest          create credit ledger entry; flip to 'vested'
//   hold_active   not yet expired; do nothing
//   extend_hold   pending fraud flag; push hold_expires_at forward
//   void_admin    attribution no longer eligible; flip to 'voided_admin'

import type { AttributionStatus } from './schema-types';

export const HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG = 7;

export type VestingOutcome = 'vest' | 'hold_active' | 'extend_hold' | 'void_admin';

export interface VestingEvaluationInput {
  now: Date;
  hold_expires_at: string;          // ISO timestamp
  attribution_status: AttributionStatus;
  pending_blocking_fraud_flags: number;
  pending_non_blocking_fraud_flags: number;
}

export interface VestingDecision {
  outcome: VestingOutcome;
  reason?: string;
  extension_days?: number;
}

const PROGRAM_ACTIVE: AttributionStatus[] = ['verified_active', 'pending_verification'];

export function evaluateVesting(input: VestingEvaluationInput): VestingDecision {
  // Hold not yet expired -> nothing to do.
  const expMs = new Date(input.hold_expires_at).getTime();
  if (input.now.getTime() < expMs) {
    return { outcome: 'hold_active' };
  }

  // Attribution no longer eligible: void.
  if (!PROGRAM_ACTIVE.includes(input.attribution_status)) {
    return {
      outcome: 'void_admin',
      reason: `attribution status ${input.attribution_status} no longer eligible for vesting`,
    };
  }

  // Pending fraud flag (any severity): extend hold to give admin time to review.
  const pendingFlags = input.pending_blocking_fraud_flags + input.pending_non_blocking_fraud_flags;
  if (pendingFlags > 0) {
    return {
      outcome: 'extend_hold',
      extension_days: HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG,
      reason: `${pendingFlags} pending fraud flag(s); admin review required before vesting`,
    };
  }

  return { outcome: 'vest' };
}
