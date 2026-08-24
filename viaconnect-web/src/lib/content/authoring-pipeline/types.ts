// Prompt 170r authoring pipeline types.
// Deterministic. Zero runtime LLM. Gordon spelling. No emojis.

export const PRIMARY_CATEGORIES = [
  'nutrient_education',
  'bioavailability_and_absorption',
  'macronutrient_patterns',
  'food_synergies_and_antagonists',
  'genetic_education',
  'lifestyle_factors',
  'condition_relevant_education',
  'supplement_mechanism',
] as const;

export type PrimaryCategory = (typeof PRIMARY_CATEGORIES)[number];

export const MEDICAL_CAUTION_LEVELS = ['low', 'medium', 'high'] as const;
export type MedicalCautionLevel = (typeof MEDICAL_CAUTION_LEVELS)[number];

export const CANONICAL_SAFETY_MODE_FILTERS = [
  'surface',
  'do_not_surface_safety_mode',
  'surface_only_safety_mode',
] as const;

export type CanonicalSafetyModeFilter =
  (typeof CANONICAL_SAFETY_MODE_FILTERS)[number];

export const SKIP_CARD_FILENAMES = [
  'INDEX.md',
  'LINT-REPORT.md',
  'PUBMED-HOLD-PATCH.md',
] as const;

export interface CardFrontmatter {
  slug: string;
  title?: string;
  subtitle?: string;
  primary_category: string;
  secondary_tags: string[];
  triggering_caq_flags: string[];
  triggering_meal_patterns: string[];
  triggering_supplement_patterns: string[];
  medical_caution_level: string;
  safety_mode_filter: string;
  bioavailability_bridge_card: boolean;
  gary_approval_required: boolean;
  gary_approved_at: string | null;
  fda_disclaimer_variant: string;
  kelsey_compliance_review_id: string | null;
}

export interface CitationRef {
  text: string;
  pmid: string | null;
  doi: string | null;
  url: string | null;
}

export interface ParsedCard {
  filePath: string;
  relativePath: string;
  raw: string;
  frontmatterRaw: string;
  frontmatter: CardFrontmatter;
  body: string;
  title: string;
  titleDerivedFromH1: boolean;
  subtitle: string | null;
  leadText: string;
  keyTakeaways: string[];
  whatToDoNext: string[];
  relatedSlugs: string[];
  citations: CitationRef[];
  wordCount: number;
  estimatedReadingTimeMinutes: number;
  hasFdaDisclaimer: boolean;
}

export interface FieldIssue {
  field: string;
  message: string;
}

export interface FrontmatterValidation {
  ok: boolean;
  issues: FieldIssue[];
}

export type LintCode =
  | 'em_dash'
  | 'en_dash'
  | 'dash_codepoint'
  | 'emoji'
  | 'semaglutide'
  | 'diagnose_treat_cure'
  | 'clinical_claim'
  | 'fda_disclaimer_missing'
  | 'bioavailability_range';

export interface LintFinding {
  code: LintCode;
  message: string;
  index: number;
  excerpt: string;
}

export interface CardLintResult {
  ok: boolean;
  findings: LintFinding[];
}

export interface PublishDecision {
  writeDraft: true;
  markPublished: boolean;
  draftState:
    | 'linter_check'
    | 'gary_approval'
    | 'approved'
    | 'published';
  reasons: string[];
}
