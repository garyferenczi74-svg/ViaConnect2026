// Prompt #103 Phase 5: Category opt-in business rules.
//
// Default-enabled categories auto-opt the practitioner in on first
// onboarding load. Opt-in categories require explicit checkbox plus
// acknowledgment of the special rules that apply.

import type { CategorySlug } from './types';

export const DEFAULT_ENABLED_CATEGORY_SLUGS: ReadonlyArray<CategorySlug> = [
  'base_formulas',
  'advanced_formulas',
  'womens_health',
];

export const OPT_IN_CATEGORY_SLUGS: ReadonlyArray<CategorySlug> = [
  'snp_support',
  'functional_mushrooms',
  'genex360_testing',
  'childrens_methylated',
];

export interface CategoryOptInRequirement {
  acknowledgment_text: string | null;
}

export const CATEGORY_OPT_IN_REQUIREMENTS: Record<CategorySlug, CategoryOptInRequirement> = {
  base_formulas:        { acknowledgment_text: null },
  advanced_formulas:    { acknowledgment_text: null },
  womens_health:        { acknowledgment_text: null },
  snp_support:          { acknowledgment_text: 'I acknowledge that SNP Support Formulations pair with GeneX360 testing context and should be recommended with genetic variant data in mind.' },
  functional_mushrooms: { acknowledgment_text: null },
  genex360_testing:     { acknowledgment_text: 'I affirm that genetic testing is within the scope of my practice and that I will review GeneX360 reports with patients.' },
  childrens_methylated: { acknowledgment_text: 'I affirm that pediatric-appropriate dosing and clinical oversight are within the scope of my practice.' },
};

export function isDefaultEnabled(slug: CategorySlug): boolean {
  return DEFAULT_ENABLED_CATEGORY_SLUGS.includes(slug);
}

export function requiresAcknowledgment(slug: CategorySlug): boolean {
  return CATEGORY_OPT_IN_REQUIREMENTS[slug].acknowledgment_text !== null;
}
