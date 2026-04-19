// Prompt #95 Phase 3: pure proposal-completeness validation.
//
// Returns a list of error messages (empty = ready to submit). Tier-aware:
// minor proposals require less than moderate/major/structural. The
// proposal builder UI calls this whenever the form changes and disables
// Submit when the array is non-empty.

import type { ImpactTier } from '@/types/governance';

export interface ValidateProposalInput {
  title: string | null | undefined;
  summary: string | null | undefined;
  pricing_domain_id: string | null | undefined;
  target_object_ids: string[] | null | undefined;
  change_type: 'price_amount' | 'discount_percent' | null | undefined;
  current_value_cents: number | null | undefined;
  proposed_value_cents: number | null | undefined;
  current_value_percent: number | null | undefined;
  proposed_value_percent: number | null | undefined;
  rationale: string | null | undefined;
  competitive_analysis: string | null | undefined;
  stakeholder_communication_plan: string | null | undefined;
  proposed_effective_date: string | null | undefined;
  grandfathering_policy: string | null | undefined;
  grandfathering_override_justification: string | null | undefined;
  default_grandfathering_policy: string | null | undefined;
  impact_tier: ImpactTier | null | undefined;
  is_emergency: boolean | null | undefined;
  emergency_justification: string | null | undefined;
}

export function validateProposalForSubmit(p: ValidateProposalInput): string[] {
  const errors: string[] = [];

  // ---- Basics always required --------------------------------------------
  if (!p.title || p.title.trim().length < 20 || p.title.length > 120) {
    errors.push('Title must be 20 to 120 characters');
  }
  if (!p.summary || p.summary.trim().length < 100 || p.summary.length > 500) {
    errors.push('Summary must be 100 to 500 characters');
  }
  if (!p.pricing_domain_id) {
    errors.push('Pricing domain is required');
  }
  if (!p.target_object_ids || p.target_object_ids.length === 0) {
    errors.push('At least one target object (SKU / tier) is required');
  }
  if (!p.change_type) {
    errors.push('Change type (price_amount or discount_percent) is required');
  }

  // ---- The change values -------------------------------------------------
  if (p.change_type === 'price_amount') {
    if (p.proposed_value_cents === null || p.proposed_value_cents === undefined) {
      errors.push('Proposed value (cents) is required');
    } else if (p.proposed_value_cents < 0) {
      errors.push('Proposed value cannot be negative');
    }
  } else if (p.change_type === 'discount_percent') {
    if (p.proposed_value_percent === null || p.proposed_value_percent === undefined) {
      errors.push('Proposed discount percent is required');
    } else if (p.proposed_value_percent < 0 || p.proposed_value_percent > 100) {
      errors.push('Proposed discount percent must be 0..100');
    }
  }

  // ---- Rationale always required (min 200 char) --------------------------
  if (!p.rationale || p.rationale.trim().length < 200) {
    errors.push('Rationale must be at least 200 characters');
  }

  // ---- Effective date at least 7 days out, unless emergency --------------
  const effective = p.proposed_effective_date ? new Date(p.proposed_effective_date) : null;
  const minEffectiveDate = new Date();
  minEffectiveDate.setDate(minEffectiveDate.getDate() + 7);
  if (!effective || isNaN(effective.getTime())) {
    errors.push('Proposed effective date is required');
  } else if (!p.is_emergency && effective.getTime() < minEffectiveDate.getTime()) {
    errors.push('Proposed effective date must be at least 7 days from now (unless emergency)');
  }

  // ---- Grandfathering policy chosen + override justification if non-default
  if (!p.grandfathering_policy) {
    errors.push('Grandfathering policy is required');
  } else if (
    p.default_grandfathering_policy &&
    p.grandfathering_policy !== p.default_grandfathering_policy &&
    (!p.grandfathering_override_justification ||
      p.grandfathering_override_justification.trim().length < 20)
  ) {
    errors.push(
      `Grandfathering override justification is required when departing from the domain default (${p.default_grandfathering_policy})`,
    );
  }

  // ---- Emergency justification required if is_emergency ------------------
  if (p.is_emergency && (!p.emergency_justification || p.emergency_justification.trim().length < 20)) {
    errors.push('Emergency justification is required when emergency flag is set');
  }

  // ---- Tier-specific requirements ----------------------------------------
  if (p.impact_tier && p.impact_tier !== 'minor') {
    if (!p.competitive_analysis || p.competitive_analysis.trim().length < 50) {
      errors.push(
        `Competitive analysis is required for ${p.impact_tier} proposals (min 50 chars)`,
      );
    }
    if (
      !p.stakeholder_communication_plan ||
      p.stakeholder_communication_plan.trim().length < 50
    ) {
      errors.push(
        `Stakeholder communication plan is required for ${p.impact_tier} proposals (min 50 chars)`,
      );
    }
  }

  return errors;
}
