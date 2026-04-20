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

// WCAG AA minimum contrast ratio for normal text against a background.
// 4.5:1 is the standard; we use this to validate that the practitioner's
// primary brand color produces a usable patient dispensary CTA when the
// system renders white text on top of the primary color.
export const WCAG_AA_NORMAL_RATIO = 4.5;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Returns the WCAG contrast ratio between two hex colors, or null if either
 * input is malformed. Used by validateBrandConfiguration to guard against
 * brand palettes that would render the patient dispensary CTA unreadable.
 */
export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

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

  // Contrast guard: the patient dispensary CTA renders white text on the
  // primary color. Reject palettes where that combination fails WCAG AA.
  if (input.primary_color_hex && isValidHexColor(input.primary_color_hex)) {
    const ratio = contrastRatio('#FFFFFF', input.primary_color_hex);
    if (ratio !== null && ratio < WCAG_AA_NORMAL_RATIO) {
      errors.push({
        field: 'primary_color_hex',
        message: `Primary color must give 4.5:1 contrast against white CTA text (got ${ratio.toFixed(2)}:1). Choose a darker shade.`,
      });
    }
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
