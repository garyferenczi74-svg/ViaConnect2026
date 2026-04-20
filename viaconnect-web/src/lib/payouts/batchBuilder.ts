// Prompt #102 Workstream B — payout batch build pure logic.

import {
  DEFAULT_MIN_PAYOUT_THRESHOLD_CENTS,
  type PayoutBatchLineStatus,
  type PayoutMethodStatus,
} from './types';

export interface EligibilityInput {
  netPayableCents: number;
  minThresholdCents: number | null;
  taxInfoStatus:
    | 'not_submitted'
    | 'submitted'
    | 'under_review'
    | 'on_file'
    | 'rejected_re_upload_required';
  payoutMethodStatus: PayoutMethodStatus | null;
  marginFloorBreach: boolean;
}

/** Pure: determine the line's status based on all eligibility gates
 *  from Prompt #102 §5.2. */
export function computeLineEligibilityStatus(input: EligibilityInput): PayoutBatchLineStatus {
  const threshold = input.minThresholdCents ?? DEFAULT_MIN_PAYOUT_THRESHOLD_CENTS;
  if (input.marginFloorBreach) return 'held_admin_review';
  if (input.netPayableCents < threshold) return 'held_below_threshold';
  if (input.taxInfoStatus !== 'on_file') return 'held_no_tax_info';
  if (input.payoutMethodStatus !== 'verified') return 'held_no_payment_method';
  return 'queued';
}

/** Pure: rail selection from priority-ordered list of verified methods.
 *  Falls through to the next method if the preferred one isn't
 *  available; returns null if no verified method exists. */
export interface RailSelectionMethod {
  methodId: string;
  rail: 'stripe_connect_ach' | 'paypal' | 'domestic_wire_us' | 'international_wire';
  status: PayoutMethodStatus;
  priority: number;
  supportsAmountCents?: (amount: number) => boolean;
}

export function selectRail(
  methods: readonly RailSelectionMethod[],
  amountCents: number,
): RailSelectionMethod | null {
  const verified = methods.filter((m) => m.status === 'verified');
  const sorted = [...verified].sort((a, b) => a.priority - b.priority);
  for (const m of sorted) {
    if (m.supportsAmountCents === undefined || m.supportsAmountCents(amountCents)) {
      return m;
    }
  }
  return null;
}

/** Pure: admin approval gate. Requires the admin to type the exact
 *  confirmation phrase so typos don't execute a live batch. */
export const BATCH_APPROVAL_CONFIRMATION_PHRASE = 'APPROVE BATCH';

export function isBatchApprovalConfirmed(typedPhrase: string): boolean {
  return typedPhrase === BATCH_APPROVAL_CONFIRMATION_PHRASE;
}
