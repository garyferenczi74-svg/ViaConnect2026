/**
 * Prompt 215: product tab model types.
 */

export const PRODUCT_TAB_KEYS = [
  'full_description',
  'ingredient_breakdown',
  'who_benefits',
  'formulation',
  'genetic_compatibility',
] as const;

export type ProductTabKey = (typeof PRODUCT_TAB_KEYS)[number];

export const PRODUCT_TAB_LABELS: Record<ProductTabKey, string> = {
  full_description: 'Full Description',
  ingredient_breakdown: 'Ingredient Breakdown',
  who_benefits: 'Who Benefits and What Makes This Different?',
  formulation: 'Formulation',
  genetic_compatibility: 'Genetic Compatibility',
};

export type ContentGateStatus = 'pending' | 'approved' | 'blocked' | 'escalated';

export interface ProductTabContent {
  productSlug: string;
  tabKey: ProductTabKey;
  bodyMd: string;
  gateStatus: ContentGateStatus;
  lastVerifiedAt: string | null;
  provenance: unknown[];
}

export type CompatibilityBand = 'green' | 'yellow' | 'red' | 'pending' | 'empty' | 'signed_out';

export type CompatibilityState =
  | 'full_data'
  | 'uploaded_only'
  | 'processing'
  | 'no_data'
  | 'signed_out';

/** Marshall-approved framing vocabulary (Gary sign-off in report). */
export const APPROVED_FRAMING = {
  green: 'strong genetic relevance for you',
  yellow: 'moderate or partial relevance',
  red: 'lower relevance for your genetics',
  red_caution: 'lower relevance for your genetics based on a flagged association in our mapping',
  disclaimer:
    'Educational information based on genetic relevance research, not medical advice. Consult a healthcare provider before making supplement decisions.',
  subline: 'Your Genetics | Your Protocol',
  brandTagline: 'Built For Your Biology',
  bioavailability: '10x to 28x',
} as const;

export interface CompatibilityResult {
  band: CompatibilityBand;
  state: CompatibilityState;
  framingLine: string;
  disclaimer: string;
  lastUpdated: string | null;
  reasons: Array<{
    ingredientLabel: string;
    rsid: string;
    gene: string;
    relevance: string;
    evidenceGrade: string;
    framing: string;
  }>;
  coverageCaveats: string[];
  scoreInputs: {
    greenWeight: number;
    yellowWeight: number;
    redWeight: number;
    matchedVariants: number;
  };
}
