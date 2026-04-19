// PayPal checkout stub interface.
//
// Real implementation is out of scope for Prompt #90. The PayPal SDK is
// not installed and no PayPal flows are wired up; checkout goes through
// Stripe exclusively for Phase 4.
//
// The interface mirrors stripe-checkout so the PayPal implementation can
// drop in later. Every function throws `NotImplementedError` so callers
// get a loud runtime signal if they attempt to use PayPal prematurely.

import type { BillingCycle, GeneX360ProductId, TierId } from '@/types/pricing';

export class PayPalNotImplementedError extends Error {
  constructor(message = 'PayPal checkout is not implemented in Phase 4') {
    super(message);
    this.name = 'PayPalNotImplementedError';
  }
}

export interface PayPalCheckoutResult {
  approvalUrl: string;
  orderId: string;
}

export async function createMembershipPayPalOrder(_args: {
  userId: string;
  tierId: TierId;
  billingCycle: BillingCycle;
}): Promise<PayPalCheckoutResult> {
  throw new PayPalNotImplementedError();
}

export async function createFamilyMembershipPayPalOrder(_args: {
  userId: string;
  totalAdults: number;
  totalChildren: number;
  billingCycle: 'monthly' | 'annual';
}): Promise<PayPalCheckoutResult> {
  throw new PayPalNotImplementedError();
}

export async function createGeneX360PayPalOrder(_args: {
  userId: string;
  productId: GeneX360ProductId;
  familyMemberId?: string | null;
}): Promise<PayPalCheckoutResult> {
  throw new PayPalNotImplementedError();
}

export async function createOutcomeStackPayPalOrder(_args: {
  userId: string;
  stackId: string;
  isSubscription: boolean;
}): Promise<PayPalCheckoutResult> {
  throw new PayPalNotImplementedError();
}
