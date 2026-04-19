// Prompt #95 Phase 1: Governance domain types.
//
// Controlled vocabulary for the pricing governance system. Row types come
// from the generated Database schema; enum types live here so a single
// change (e.g., adding a new impact tier) fails at compile time across
// every consumer until every path updates.

import type { Database } from '@/lib/supabase/types';

// ----- Row-shaped types from the generated schema --------------------------

export type PricingDomainRow = Database['public']['Tables']['pricing_domains']['Row'];
export type PricingProposalRow = Database['public']['Tables']['pricing_proposals']['Row'];
export type ProposalApprovalRow = Database['public']['Tables']['proposal_approvals']['Row'];
export type ProposalCommentRow = Database['public']['Tables']['proposal_comments']['Row'];
export type DecisionRightsRuleRow = Database['public']['Tables']['decision_rights_rules']['Row'];
export type PriceChangeHistoryRow = Database['public']['Tables']['price_change_history']['Row'];
export type CompetitorPricingRow = Database['public']['Tables']['competitor_pricing']['Row'];

// ----- Controlled vocabulary ------------------------------------------------

export type PricingDomainCategory =
  | 'consumer_subscription'
  | 'practitioner_subscription'
  | 'one_time_purchase'
  | 'certification'
  | 'wholesale_discount'
  | 'outcome_stack_discount'
  | 'helix_redemption_cap'
  | 'supplement_msrp'
  | 'peptide_msrp';

export type GrandfatheringPolicy =
  | 'indefinite'
  | 'twelve_months'
  | 'six_months'
  | 'thirty_days'
  | 'no_grandfathering';

export type ChangeType = 'price_amount' | 'discount_percent';

export type ImpactTier = 'minor' | 'moderate' | 'major' | 'structural';

export type ProposalStatus =
  | 'draft'
  | 'submitted_for_approval'
  | 'under_review'
  | 'approved_pending_activation'
  | 'activating'
  | 'activated'
  | 'rolled_back'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export type ApproverRole =
  | 'ceo'
  | 'cfo'
  | 'advisory_cto'
  | 'advisory_medical'
  | 'board_member';

export type ApprovalDecision = 'approved' | 'rejected' | 'abstain';

export type CommentType =
  | 'discussion'
  | 'concern'
  | 'question'
  | 'answer'
  | 'clarification';

export type ChangeAction = 'activation' | 'rollback';

export type CompetitorCategory =
  | 'consumer_subscription'
  | 'practitioner_subscription'
  | 'genetic_test'
  | 'supplement_retail'
  | 'peptide_retail'
  | 'certification'
  | 'precision_wellness_platform'
  | 'other';

export type CompetitorBillingCycle = 'monthly' | 'annual' | 'one_time' | 'per_unit';

// ----- Classification result shape -----------------------------------------

export interface ClassificationResult {
  tier: ImpactTier;
  percentChange: number;
  reasons: string[];
  requiredApprovers: ApproverRole[];
  advisoryApprovers: ApproverRole[];
  requiresBoardNotification: boolean;
  requiresBoardApproval: boolean;
  slaHours: number | null;
}
