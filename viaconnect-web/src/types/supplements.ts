// Canonical supplement types for the ViaConnect photo OCR + JSONB pipeline

export interface IngredientBreakdownEntry {
  ingredientId: string;
  name: string;
  form: string | null;
  forms: string[] | null;
  amount: number | null;
  unit: string | null;
  dailyValuePercent: number | null;
  isProprietaryBlend: boolean;
  proprietaryBlendName: string | null;
  proprietaryBlendTotal: number | null;
  proprietaryBlendUnit: string | null;
  perFormBreakdown: Record<string, number> | "undisclosed" | null;
  effectiveDose: number | null;
  effectiveDoseUnit: string | null;
  bioavailability_note: string | null;
  evidence_type: 'this_sku' | 'class_not_this_sku' | 'not_stated';
  pmid: string | null;
  interactionCheckRequired: boolean;
  interactionSeverity: "none" | "minor" | "moderate" | "major" | "synergistic" | null;
  interactionDetails: string | null;
}

export interface SupplementEntry {
  id: string;
  userId: string;
  brand: string;
  productName: string;
  productCacheId: string | null;
  deliveryMethod: DeliveryMethod;
  dosageAmount: number;
  dosageUnit: string;
  frequency: string;
  timeOfDay: string[];
  bioavailabilityEstimate: number;
  ingredientBreakdown: IngredientBreakdownEntry[];
  nonMedicinalIngredients: string[];
  allergenWarnings: string[];
  photoUrl: string | null;
  sourceUrls: string[];
  ocrConfidence: number;
  isManualEntry: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryMethod =
  | "standard_capsule"
  | "standard_tablet"
  | "softgel"
  | "liquid"
  | "powder"
  | "sublingual"
  | "liposomal"
  | "topical"
  | "amino_acids_peptides"
  | "gummy";

// Invented delivery-form absorption fractions (liposomal 0.90, capsule 0.20, etc.)
// were removed 24 Aug 2026. this_sku human PK is 0. Do not reintroduce a map.

export interface OCRExtractedData {
  brand: string | null;
  productName: string | null;
  productType: string | null;
  claimsText: string[] | null;
  servingSize: string | null;
  servingsPerContainer: number | null;
  totalCount: number | null;
  dosagePerServing: string | null;
  npc_npn_ndc: string | null;
  ingredients: OCRIngredient[];
  nonMedicinalIngredients: string[] | null;
  allergenWarnings: string[] | null;
  otherVisibleInfo: {
    lotNumber: string | null;
    expiryDate: string | null;
    manufacturer: string | null;
    countryOfOrigin: string | null;
    certifications: string[] | null;
  };
  overallConfidence: "high" | "medium" | "low";
  photoType: string;
  needsAdditionalPhoto: boolean;
  additionalPhotoSuggestion: string | null;
}

export interface OCRIngredient {
  name: string;
  form: string | null;
  amount: number | null;
  unit: string | null;
  dailyValuePercent: number | null;
  isPartOfBlend: boolean;
  blendName: string | null;
}

export interface WebSearchEnrichmentResult {
  fullIngredients: OCRIngredient[];
  nonMedicinalIngredients: string[];
  allergenWarnings: string[];
  sourceUrls: string[];
  enrichmentConfidence: number;
  isProprietaryBlend: boolean;
  proprietaryBlendDetails: {
    blendName: string;
    totalAmount: number | null;
    unit: string;
    subIngredientCount: number;
    individualAmountsDisclosed: boolean;
  } | null;
}

export type ProcessingState =
  | "uploading"
  | "analyzing"
  | "searching"
  | "assembling"
  | "checking"
  | "complete"
  | "failed"
  | "manual_review";
