// Prompt #96 Phase 3: Brand validation + naming + claim detection.
//
// Pure functions used by:
//   - the brand-config CRUD API to reject invalid inputs at the boundary
//   - the brand setup wizard for inline form validation
//   - the label designer to compute the displayed product name
//   - the compliance pre-check to surface likely claim language to the
//     practitioner BEFORE submission (the formal automated checklist
//     in Phase 4 is the authoritative gate)

import { isValidHexColor, type ProductNamingScheme } from './schema-types';

// ---------------------------------------------------------------------------
// Brand validation
// ---------------------------------------------------------------------------

export interface BrandConfigInput {
  brand_name: string;
  primary_color_hex: string | null;
  secondary_color_hex: string | null;
  accent_color_hex: string | null;
  background_color_hex: string | null;
  text_color_hex: string | null;
  practice_legal_name: string;
  practice_address_line_1: string;
  practice_city: string;
  practice_state: string;
  practice_postal_code: string;
  practice_phone: string;
  practice_email: string;
  product_naming_scheme: ProductNamingScheme;
  practice_prefix: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBrandConfiguration(input: BrandConfigInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.brand_name || input.brand_name.trim().length < 2) {
    errors.push({ field: 'brand_name', message: 'Brand name is required (2+ characters).' });
  }

  // Hex color fields are optional but must be valid when present.
  for (const field of [
    'primary_color_hex', 'secondary_color_hex', 'accent_color_hex',
    'background_color_hex', 'text_color_hex',
  ] as const) {
    const value = input[field];
    if (value && !isValidHexColor(value)) {
      errors.push({ field, message: `${field} must be a 6-digit hex (e.g. #1a3b6e).` });
    }
  }

  for (const field of [
    'practice_legal_name', 'practice_address_line_1', 'practice_city',
    'practice_state', 'practice_postal_code', 'practice_phone', 'practice_email',
  ] as const) {
    const v = input[field];
    if (!v || v.trim().length === 0) {
      errors.push({ field, message: `${field.replace(/_/g, ' ')} is required.` });
    }
  }

  if (input.practice_email && !EMAIL_RE.test(input.practice_email.trim())) {
    errors.push({ field: 'practice_email', message: 'Practice email must be a valid address.' });
  }

  if (
    input.product_naming_scheme === 'practice_prefix_plus_viacura' &&
    (!input.practice_prefix || input.practice_prefix.trim().length === 0)
  ) {
    errors.push({
      field: 'practice_prefix',
      message: 'Practice prefix is required for the prefix-plus-ViaCura naming scheme.',
    });
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

export interface ResolveProductNameInput {
  scheme: ProductNamingScheme;
  practicePrefix: string | null;
  customName: string | null;
  product: { name: string; sku: string };
}

export function resolveProductName(input: ResolveProductNameInput): string {
  const trim = (s: string | null | undefined) => (s ?? '').trim();
  switch (input.scheme) {
    case 'viacura_name':
      return input.product.name;
    case 'practice_prefix_plus_viacura': {
      const prefix = trim(input.practicePrefix);
      return prefix ? `${prefix} ${input.product.name}` : input.product.name;
    }
    case 'fully_custom': {
      const custom = trim(input.customName);
      return custom || input.product.name;
    }
  }
}

// ---------------------------------------------------------------------------
// Claim detection (advisory only; Phase 4 has the formal checklist)
// ---------------------------------------------------------------------------

const CLAIM_VERBS = /\b(supports?|maintains?|promotes?|helps?\s+maintain|enhances?|improves?)\b/i;
const BODY_FUNCTIONS =
  /\b(cardiovascular|cellular|cognitive|cognition|immune|digestive|gut|joint|metabolic|liver|kidney|skin|hair|nail|blood\s+sugar|glucose|hormone|sleep|stress|energy|mood|memory|focus|circulation|respiratory|bone|muscle|heart|brain)\b/i;

const DISEASE_VERBS = /\b(cure|cures|treat|treats|diagnose|diagnoses|heal|heals|remedy)\b/i;
const DISEASE_TERMS_FOR_PREVENT =
  /\b(disease|cancer|diabetes|alzheimer|parkinson|arthritis|inflammation|infection|covid|asthma|depression)\b/i;

export function detectStructureFunctionClaims(text: string | null | undefined): boolean {
  if (!text) return false;
  return CLAIM_VERBS.test(text) && BODY_FUNCTIONS.test(text);
}

export function detectDiseaseClaims(text: string | null | undefined): boolean {
  if (!text) return false;
  if (DISEASE_VERBS.test(text)) return true;
  // "prevent" only counts as a disease claim when paired with a disease term;
  // "prevention" / "preventive" alone is allowed marketing language.
  if (/\bprevents?\b/i.test(text) && DISEASE_TERMS_FOR_PREVENT.test(text)) return true;
  return false;
}
