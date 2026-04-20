// Prompt #96 Phase 5: Cancellation fee + refund calculator.
//
// Pure function. Input: cancellation stage + total/deposit + admin
// override flag. Output: { allowed, fee_cents, refund_cents,
// balance_due_cents, reason }. The API route maps the production
// order's current status to a stage and calls this; admin override
// always refunds the full deposit.
//
// Per spec:
//   before_deposit                      -> free, no fee
//   after_deposit_before_production     -> 10% admin fee on deposit
//   after_production_before_qc          -> deposit forfeited; balance due
//   after_qc                            -> not allowed (no refund, no
//                                          cancellation; practitioner must
//                                          take delivery)
//   admin_override (any stage)          -> full deposit refund, no fees,
//                                          no balance

export const CANCELLATION_ADMIN_FEE_PERCENT = 10;

export type CancellationStage =
  | 'before_deposit'
  | 'after_deposit_before_production'
  | 'after_production_before_qc'
  | 'after_qc';

export interface CancellationInput {
  stage: CancellationStage;
  total_cents: number;
  deposit_paid_cents: number;
  admin_override: boolean;
}

export interface CancellationOutcome {
  allowed: boolean;
  fee_cents: number;
  refund_cents: number;
  balance_due_cents: number;
  reason: string;
}

export function computeCancellationOutcome(input: CancellationInput): CancellationOutcome {
  if (input.admin_override) {
    return {
      allowed: true,
      fee_cents: 0,
      refund_cents: input.deposit_paid_cents,
      balance_due_cents: 0,
      reason: 'Admin override: ViaCura-initiated cancellation; full deposit refunded.',
    };
  }

  switch (input.stage) {
    case 'before_deposit':
      return {
        allowed: true,
        fee_cents: 0,
        refund_cents: 0,
        balance_due_cents: 0,
        reason: 'Cancellation before deposit incurs no fee.',
      };
    case 'after_deposit_before_production': {
      const fee = Math.round(input.deposit_paid_cents * CANCELLATION_ADMIN_FEE_PERCENT / 100);
      return {
        allowed: true,
        fee_cents: fee,
        refund_cents: input.deposit_paid_cents - fee,
        balance_due_cents: 0,
        reason: `Cancellation after deposit incurs the ${CANCELLATION_ADMIN_FEE_PERCENT}% administrative fee.`,
      };
    }
    case 'after_production_before_qc':
      return {
        allowed: true,
        fee_cents: input.deposit_paid_cents,
        refund_cents: 0,
        balance_due_cents: Math.max(0, input.total_cents - input.deposit_paid_cents),
        reason: 'Cancellation after production starts forfeits the deposit and the production cost balance is due.',
      };
    case 'after_qc':
      return {
        allowed: false,
        fee_cents: 0,
        refund_cents: 0,
        balance_due_cents: 0,
        reason: 'Cancellation is not allowed once QC is complete; practitioner is obligated to take delivery.',
      };
  }
}
