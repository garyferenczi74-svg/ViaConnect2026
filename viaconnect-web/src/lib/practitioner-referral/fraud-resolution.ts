// Prompt #98 Phase 6: Admin fraud-resolution decision.
//
// Pure. Given the admin's requested action + context about the flag
// (has linked event? event already vested? attribution-level fraud
// count?), returns the mutation plan the route applies atomically:
//   - next_flag_status: 'confirmed_fraud' | 'cleared_benign' | 'admin_override'
//   - void_milestone_event: flip the linked event to voided_fraud
//   - clawback_ledger_entry: on confirm, write a compensating
//     negative ledger row when the event already vested
//   - void_attribution + deactivate_code: systemic-fraud escalation
//     (3 or more cumulative flags on one attribution)
//
// Reason length requirements:
//   confirm_fraud   20+ chars
//   clear_benign    20+ chars
//   admin_override  50+ chars (detailed; the rarest + highest-scrutiny path)

import type { VestingStatus } from './schema-types';

export type AdminAction = 'confirm_fraud' | 'clear_benign' | 'admin_override';

export const REASON_MIN_CHARS: Record<AdminAction, number> = {
  confirm_fraud: 20,
  clear_benign: 20,
  admin_override: 50,
};

const SYSTEMIC_FRAUD_THRESHOLD = 3;

export interface ResolutionInput {
  admin_action: AdminAction;
  reason: string;
  flag_has_milestone_event_link: boolean;
  milestone_event_vested: boolean;
  milestone_event_vesting_status: VestingStatus;
  attribution_fraud_flag_count_including_this: number;
}

export interface ResolutionDecision {
  ok: boolean;
  reason_invalid?: boolean;
  next_flag_status?: 'confirmed_fraud' | 'cleared_benign' | 'admin_override';
  void_milestone_event?: boolean;
  clawback_ledger_entry?: boolean;
  void_attribution?: boolean;
  deactivate_code?: boolean;
}

export function evaluateFraudResolution(input: ResolutionInput): ResolutionDecision {
  const valid = (REASON_MIN_CHARS[input.admin_action] ?? 0) <= (input.reason?.trim().length ?? 0);
  if (!input.admin_action || !['confirm_fraud', 'clear_benign', 'admin_override'].includes(input.admin_action)) {
    return { ok: false };
  }
  if (!valid) {
    return { ok: false, reason_invalid: true };
  }

  if (input.admin_action === 'clear_benign') {
    return {
      ok: true,
      next_flag_status: 'cleared_benign',
      void_milestone_event: false,
      clawback_ledger_entry: false,
      void_attribution: false,
      deactivate_code: false,
    };
  }

  if (input.admin_action === 'admin_override') {
    return {
      ok: true,
      next_flag_status: 'admin_override',
      void_milestone_event: false,
      clawback_ledger_entry: false,
      void_attribution: false,
      deactivate_code: false,
    };
  }

  // confirm_fraud
  const systemic = input.attribution_fraud_flag_count_including_this >= SYSTEMIC_FRAUD_THRESHOLD;
  return {
    ok: true,
    next_flag_status: 'confirmed_fraud',
    void_milestone_event: input.flag_has_milestone_event_link,
    clawback_ledger_entry: input.flag_has_milestone_event_link && input.milestone_event_vested,
    void_attribution: systemic,
    deactivate_code: systemic,
  };
}

// ---------------------------------------------------------------------------
// Clawback ledger delta
// ---------------------------------------------------------------------------

export interface ClawbackInput {
  vested_amount_cents: number;   // 0 when the event was not vested
}

export interface ClawbackDelta {
  entry_type: 'voided_fraud';
  amount_cents: number;          // negative on actual clawback; 0 on no-op
}

export function buildClawbackLedgerDelta(input: ClawbackInput): ClawbackDelta {
  return {
    entry_type: 'voided_fraud',
    amount_cents: input.vested_amount_cents > 0 ? -input.vested_amount_cents : 0,
  };
}
