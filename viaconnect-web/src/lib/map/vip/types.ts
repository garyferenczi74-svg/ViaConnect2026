// Prompt #101 Workstream C — VIP exemption types + limits.

export type MAPVIPExemptionReason =
  | 'long_term_patient'
  | 'immediate_family'
  | 'documented_financial_hardship'
  | 'returning_chronic_illness_subscription'
  | 'clinical_trial_compassionate_use'
  | 'other_documented';

export type MAPVIPExemptionStatus =
  | 'pending_approval'
  | 'active'
  | 'expired_auto'
  | 'revoked'
  | 'rejected';

export const MAX_CONCURRENT_ACTIVE_VIP_EXEMPTIONS_PER_PRACTITIONER = 5;
export const VIP_EXEMPTION_AUTO_EXPIRY_DAYS = 180;
export const VIP_EXEMPTION_MAX_WINDOW_DAYS = 180;

export const VIP_SENSITIVE_REASONS: ReadonlyArray<MAPVIPExemptionReason> = [
  'documented_financial_hardship',
  'returning_chronic_illness_subscription',
  'clinical_trial_compassionate_use',
];

export function reasonRequiresEncryptedNote(reason: MAPVIPExemptionReason): boolean {
  return (VIP_SENSITIVE_REASONS as readonly MAPVIPExemptionReason[]).includes(reason);
}

export interface VIPExemptionRow {
  vipExemptionId: string;
  practitionerId: string;
  customerClientId: string | null;
  manualCustomerId: string | null;
  productId: string;
  tier: 'L1' | 'L2';
  exemptedPriceCents: number;
  reason: MAPVIPExemptionReason;
  status: MAPVIPExemptionStatus;
  exemptionStartAt: string;
  exemptionEndAt: string;
  autoExpiryAt: string;
  lastOrderAt: string | null;
  createdAt: string;
}
