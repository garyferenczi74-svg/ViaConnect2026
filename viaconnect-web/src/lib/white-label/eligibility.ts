// Prompt #96 Phase 2: White-label eligibility engine.
//
// Two-layer split (mirrors the cohort/CAC/LTV pattern from Prompt #94):
//
//   * evaluateEligibility (PURE): takes pre-fetched signals + a clock,
//     returns a typed result. No Supabase. Trivially testable.
//   * checkPractitionerEligibility (DB): loads the signals, calls the pure
//     core, returns the same shape.
//
// OR logic across three paths per spec:
//   1. certification_level_3            active, non-revoked Master Practitioner
//                                       cert with expires_at > now
//   2. white_label_tier_subscription    active subscription on tier_id='white_label'
//   3. volume_threshold                 active practitioner, onboarded >= 12mo
//                                       ago, lifetime wholesale >= $25,000
//
// Path priority for primary_path is the spec order above (cert wins ties).

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Spec defaults
// ---------------------------------------------------------------------------

export const VOLUME_THRESHOLD_CENTS = 2_500_000; // $25,000
export const VOLUME_TENURE_MONTHS = 12;

// ---------------------------------------------------------------------------
// Signal shapes
// ---------------------------------------------------------------------------

export interface CertificationSignal {
  id: string;
  certified_at: string;
  expires_at: string;
  status: string;
}

export interface SubscriptionSignal {
  id: string;
  tier_id: string;
  status: string;
  current_period_end: string;
}

export interface EligibilitySignals {
  now: Date;
  activeMasterPractitionerCertification: CertificationSignal | null;
  activeWhiteLabelSubscription: SubscriptionSignal | null;
  practitionerOnboardedAt: string | null;
  accountStatus: string | null;
  lifetimeWholesaleCents: number;
}

export type QualifyingPathId =
  | 'certification_level_3'
  | 'white_label_tier_subscription'
  | 'volume_threshold';

export interface EligibilityCheckResult {
  is_eligible: boolean;
  qualifying_paths: QualifyingPathId[];
  evidence: {
    certification?: CertificationSignal;
    subscription?: SubscriptionSignal;
    volume?: {
      onboarded_at: string;
      lifetime_wholesale_cents: number;
    };
  };
  primary_path: QualifyingPathId | null;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

export function evaluateEligibility(input: EligibilitySignals): EligibilityCheckResult {
  const paths: QualifyingPathId[] = [];
  const evidence: EligibilityCheckResult['evidence'] = {};
  const reasons: string[] = [];

  // Path 1: certification (must be 'certified' AND expires_at > now)
  const cert = input.activeMasterPractitionerCertification;
  if (cert && cert.status === 'certified' && new Date(cert.expires_at) > input.now) {
    paths.push('certification_level_3');
    evidence.certification = cert;
    reasons.push('Active Level 3 Master Practitioner certification.');
  }

  // Path 2: White-Label tier subscription (must be tier_id='white_label' AND status='active')
  const sub = input.activeWhiteLabelSubscription;
  if (sub && sub.tier_id === 'white_label' && sub.status === 'active') {
    paths.push('white_label_tier_subscription');
    evidence.subscription = sub;
    reasons.push('Active White-Label Platform tier subscription.');
  }

  // Path 3: 12+ month tenure AND $25K+ lifetime wholesale (account must be active)
  if (
    input.accountStatus === 'active' &&
    input.practitionerOnboardedAt &&
    input.lifetimeWholesaleCents >= VOLUME_THRESHOLD_CENTS
  ) {
    const onboarded = new Date(input.practitionerOnboardedAt);
    const cutoff = new Date(input.now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - VOLUME_TENURE_MONTHS);
    if (onboarded <= cutoff) {
      paths.push('volume_threshold');
      evidence.volume = {
        onboarded_at: input.practitionerOnboardedAt,
        lifetime_wholesale_cents: input.lifetimeWholesaleCents,
      };
      reasons.push(
        `${VOLUME_TENURE_MONTHS}+ months tenure, $${(input.lifetimeWholesaleCents / 100).toLocaleString()} lifetime wholesale volume.`,
      );
    }
  }

  const isEligible = paths.length > 0;
  return {
    is_eligible: isEligible,
    qualifying_paths: paths,
    evidence,
    primary_path: paths[0] ?? null,
    reasons: isEligible ? reasons : ['Does not meet any of the three eligibility paths.'],
  };
}

// ---------------------------------------------------------------------------
// DB wrapper
// ---------------------------------------------------------------------------

export interface EligibilityDeps {
  supabase: SupabaseClient | unknown;
  now?: Date;
}

export async function checkPractitionerEligibility(
  practitionerId: string,
  deps: EligibilityDeps,
): Promise<EligibilityCheckResult> {
  const sb = deps.supabase as any;
  const now = deps.now ?? new Date();

  const [certRes, subRes, practRes] = await Promise.all([
    sb.from('practitioner_certifications')
      .select('id, certified_at, expires_at, status')
      .eq('practitioner_id', practitionerId)
      .eq('certification_level_id', 'master_practitioner')
      .eq('status', 'certified')
      .order('expires_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    sb.from('practitioner_subscriptions')
      .select('id, tier_id, status, current_period_end')
      .eq('practitioner_id', practitionerId)
      .eq('tier_id', 'white_label')
      .eq('status', 'active')
      .maybeSingle(),
    sb.from('practitioners')
      .select('id, onboarded_at, account_status')
      .eq('id', practitionerId)
      .maybeSingle(),
  ]);

  let lifetimeWholesaleCents = 0;
  if (practRes.data?.account_status === 'active' && practRes.data?.onboarded_at) {
    const { data: volumeData } = await sb.rpc('sum_practitioner_wholesale_volume', {
      p_practitioner_id: practitionerId,
    });
    lifetimeWholesaleCents = typeof volumeData === 'number' ? volumeData : Number(volumeData ?? 0);
  }

  return evaluateEligibility({
    now,
    activeMasterPractitionerCertification: certRes.data ?? null,
    activeWhiteLabelSubscription: subRes.data ?? null,
    practitionerOnboardedAt: practRes.data?.onboarded_at ?? null,
    accountStatus: practRes.data?.account_status ?? null,
    lifetimeWholesaleCents,
  });
}
