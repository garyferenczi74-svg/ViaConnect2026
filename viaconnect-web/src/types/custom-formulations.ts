// Prompt #97 Phase 1: Level 4 Custom Formulations domain types.
//
// Row types sourced from the generated Database schema; enum types live
// here so a single CHECK-constraint change surfaces everywhere as a type
// error. Prohibited categories are enforced at runtime by the Phase 3
// validation engine (hardcoded block list); this module defines the enum
// vocabulary only.

import type { Database } from '@/lib/supabase/types';

// ----- Row shapes from the generated schema -------------------------------

export type IngredientLibraryRow = Database['public']['Tables']['ingredient_library']['Row'];
export type IngredientInteractionRow =
  Database['public']['Tables']['ingredient_library_interactions']['Row'];
export type Level4EnrollmentRow = Database['public']['Tables']['level_4_enrollments']['Row'];
export type CustomFormulationRow = Database['public']['Tables']['custom_formulations']['Row'];
export type CustomFormulationIngredientRow =
  Database['public']['Tables']['custom_formulation_ingredients']['Row'];
export type CustomFormulationMedicalReviewRow =
  Database['public']['Tables']['custom_formulation_medical_reviews']['Row'];
export type CustomFormulationRegulatoryReviewRow =
  Database['public']['Tables']['custom_formulation_regulatory_reviews']['Row'];
export type CustomFormulationDevelopmentFeeRow =
  Database['public']['Tables']['custom_formulation_development_fees']['Row'];
export type CustomFormulationStabilityTestRow =
  Database['public']['Tables']['custom_formulation_stability_tests']['Row'];

// ----- Controlled vocabularies -------------------------------------------

export type IngredientCategory =
  | 'vitamin'
  | 'mineral'
  | 'amino_acid'
  | 'botanical_herb'
  | 'enzyme'
  | 'probiotic_strain'
  | 'fatty_acid'
  | 'phytochemical'
  | 'nutraceutical'
  | 'antioxidant'
  | 'mushroom_extract'
  | 'fiber'
  | 'excipient_filler'
  | 'other';

export type RegulatoryStatus =
  | 'pre_1994_dietary_ingredient'
  | 'gras_affirmed'
  | 'ndi_notified_accepted'
  | 'ndi_required_not_filed'
  | 'prohibited'
  | 'under_review';

export type DoseUnit = 'mg' | 'mcg' | 'iu' | 'g' | 'cfu_billions' | 'mg_per_kg';

/** Dose units admissible in custom_formulation_ingredients (mg_per_kg is
 *  library-only; not valid on an actual formulation row). */
export type FormulationDoseUnit = 'mg' | 'mcg' | 'iu' | 'g' | 'cfu_billions';

export type PregnancyCategory = 'safe' | 'caution' | 'contraindicated' | 'insufficient_data';

export type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated';

export type DeliveryForm =
  | 'capsule'
  | 'tablet'
  | 'powder'
  | 'liquid_sublingual'
  | 'liquid_drops'
  | 'chewable'
  | 'gummy';

export type CapsuleSize = '00' | '0' | '1' | '2' | '3' | '4';

export type FormulationStatus =
  | 'draft'
  | 'ready_for_validation'
  | 'validation_failed'
  | 'ready_for_review'
  | 'under_medical_review'
  | 'under_regulatory_review'
  | 'revision_requested'
  | 'approved_pending_development_fee'
  | 'approved_production_ready'
  | 'archived'
  | 'rejected';

export type Level4EnrollmentStatus =
  | 'pending_eligibility'
  | 'eligibility_verified'
  | 'formulation_development'
  | 'active'
  | 'paused'
  | 'terminated';

export type ReviewDecision = 'approved' | 'revision_requested' | 'rejected';

export type StabilityTestStatus = 'scheduled' | 'in_progress' | 'complete' | 'failed';

export type DevelopmentFeeRefundReason =
  | 'applied_to_first_production_order'
  | 'practitioner_abandoned'
  | 'validation_failed'
  | 'medical_review_rejected'
  | 'regulatory_review_rejected'
  | 'viacura_cannot_source'
  | 'admin_override_refund';

// ----- Prohibited ingredient category registry (Phase 3 validation) -----
//
// Hardcoded block list for categories that must NEVER appear in a Level 4
// custom formulation regardless of ingredient_library.is_available_for_custom_formulation.
// Changes here require code review; the list is intentionally not
// DB-configurable.

export const PROHIBITED_INGREDIENT_ID_BLOCKLIST: readonly string[] = [
  // Peptides (not eligible for DSHEA dietary supplement designation)
  'ipamorelin', 'cjc_1295', 'bpc_157', 'tb_500', 'ghrp_6', 'ghrp_2',
  'sermorelin', 'ghk_cu', 'mots_c', 'epithalon',
  // Hormones (prescription-only or OTC with dose-dependent risk)
  'dhea_high_dose', 'pregnenolone', 'estriol', 'testosterone_any',
  'progesterone_bioidentical', 'melatonin_high_dose',
  // CBD / cannabis derivatives
  'cbd_isolate', 'cbd_full_spectrum', 'cbd_broad_spectrum',
  'thc_any', 'cbg_isolate', 'cbn_isolate',
  // FDA safety-concern ingredients
  'kratom', 'ephedra', 'ephedrine', 'yohimbine_unrefined',
  'aristolochia_fangchi', 'comfrey_root_internal', 'germander',
] as const;

export const PROHIBITED_INGREDIENT_ID_SET: ReadonlySet<string> = new Set(
  PROHIBITED_INGREDIENT_ID_BLOCKLIST,
);

// ----- Validation result shapes (consumed by Phase 3 UI) -----------------

export type ValidationSeverity = 'blocker' | 'warning' | 'info';

export type ValidationCategory =
  | 'prohibited'
  | 'ul_exceeded'
  | 'interaction'
  | 'dose'
  | 'pediatric'
  | 'pregnancy'
  | 'regulatory';

export interface ValidationIssue {
  severity: ValidationSeverity;
  category: ValidationCategory;
  ingredientId?: string;
  ingredientBId?: string;
  message: string;
  suggestedFix?: string;
}

export interface ValidationResult {
  overallPassed: boolean;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  estimatedCogsPerUnitCents: number;
}
