// Prompt #101 Workstream B — waiver types + limits.

export type MAPWaiverType =
  | 'seasonal_promotion'
  | 'charity_event'
  | 'clinic_in_person_only'
  | 'clinical_study_recruitment'
  | 'new_patient_onboarding';

export type MAPWaiverStatus =
  | 'draft'
  | 'pending_approval'
  | 'info_requested'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'rejected';

export interface WaiverTypeRule {
  maxDurationDays: number;
  maxDiscountPctBelowMAP: number;
  requiresAdminApproval: boolean;
  requiresComplianceOfficer: boolean;
  requiresMedicalDirector: boolean;
  autoApproveForTiers?: ReadonlyArray<'Platinum' | 'Gold'>;
  evidenceRequired: boolean;
}

export const WAIVER_TYPE_RULES: Record<MAPWaiverType, WaiverTypeRule> = {
  seasonal_promotion: {
    maxDurationDays: 60,
    maxDiscountPctBelowMAP: 25,
    requiresAdminApproval: true,
    requiresComplianceOfficer: false,
    requiresMedicalDirector: false,
    evidenceRequired: false,
  },
  charity_event: {
    maxDurationDays: 14,
    maxDiscountPctBelowMAP: 50,
    requiresAdminApproval: true,
    requiresComplianceOfficer: true,
    requiresMedicalDirector: false,
    evidenceRequired: true,
  },
  clinic_in_person_only: {
    maxDurationDays: 90,
    maxDiscountPctBelowMAP: 30,
    requiresAdminApproval: true,
    requiresComplianceOfficer: false,
    requiresMedicalDirector: false,
    evidenceRequired: true,
  },
  clinical_study_recruitment: {
    maxDurationDays: 180,
    maxDiscountPctBelowMAP: 40,
    requiresAdminApproval: true,
    requiresComplianceOfficer: false,
    requiresMedicalDirector: true,
    evidenceRequired: true,
  },
  new_patient_onboarding: {
    maxDurationDays: 30,
    maxDiscountPctBelowMAP: 20,
    requiresAdminApproval: true,
    requiresComplianceOfficer: false,
    requiresMedicalDirector: false,
    autoApproveForTiers: ['Platinum', 'Gold'],
    evidenceRequired: false,
  },
};

export const MAX_CONCURRENT_ACTIVE_WAIVERS_PER_PRACTITIONER = 3;
export const WAIVER_JUSTIFICATION_MIN_CHARS = 100;
export const WAIVER_JUSTIFICATION_MAX_CHARS = 2000;

export interface WaiverSkuLine {
  productId: string;
  tier: 'L1' | 'L2';
  waivedPriceCents: number;
  ingredientCostFloorCents: number;
}

export interface WaiverRow {
  waiverId: string;
  practitionerId: string;
  waiverType: MAPWaiverType;
  status: MAPWaiverStatus;
  scopeDescription: string;
  scopeUrls: string[];
  waiverStartAt: string;
  waiverEndAt: string;
  justification: string;
  createdAt: string;
  reviewedAt: string | null;
  revokedAt: string | null;
}
