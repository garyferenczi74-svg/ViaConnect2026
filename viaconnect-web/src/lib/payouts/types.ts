// Prompt #102 Workstream B — payout types.

export type PayoutRail =
  | 'stripe_connect_ach'
  | 'paypal'
  | 'domestic_wire_us'
  | 'international_wire';

export type PayoutMethodStatus =
  | 'pending_setup'
  | 'verified'
  | 'failed_verification'
  | 'revoked';

export type PayoutBatchLineStatus =
  | 'queued'
  | 'held_below_threshold'
  | 'held_no_tax_info'
  | 'held_no_payment_method'
  | 'held_admin_review'
  | 'paying'
  | 'paid'
  | 'failed';

export interface PayoutMethodSummary {
  methodId: string;
  rail: PayoutRail;
  status: PayoutMethodStatus;
  priority: number;
  displayLabel: string;
}

/** §3.3: USD $100 default minimum payout threshold. */
export const DEFAULT_MIN_PAYOUT_THRESHOLD_CENTS = 100_00;

/** Rail fee schedule. */
export const RAIL_FEE_CONFIG: Record<PayoutRail, {
  fixedCents: number;
  variablePct: number;
  capCents?: number;
}> = {
  stripe_connect_ach: { fixedCents: 25, variablePct: 0.25 },
  paypal: { fixedCents: 0, variablePct: 2, capCents: 20_00 },
  domestic_wire_us: { fixedCents: 25_00, variablePct: 0 },
  international_wire: { fixedCents: 45_00, variablePct: 0 },
};
