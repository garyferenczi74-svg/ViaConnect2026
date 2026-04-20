// Prompt #103 Phase 1: Product category taxonomy type model.
//
// Seven authoritative categories confirmed April 20, 2026. Each
// category declares its identity-mark rule + palette rule. The DB
// enforces these via triggers (see 20260422000040_extend_products.sql);
// these constants and helpers mirror the DB truth for runtime checks.

export const CATEGORY_SLUGS = [
  'base_formulas',
  'advanced_formulas',
  'womens_health',
  'childrens_methylated',
  'snp_support',
  'functional_mushrooms',
  'genex360_testing',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
export const CANONICAL_CATEGORY_COUNT = 7;

export const IDENTITY_MARK_TYPES = [
  'methylated_formula',
  'dual_delivery_technology',
  'none',
] as const;
export type IdentityMarkType = (typeof IDENTITY_MARK_TYPES)[number];

export const PALETTE_RULE_TYPES = [
  'single_palette_category_wide',
  'per_sku_palette',
  'not_applicable',
] as const;
export type PaletteRuleType = (typeof PALETTE_RULE_TYPES)[number];

export interface ProductCategory {
  product_category_id: string;
  category_slug: CategorySlug | string;
  display_name: string;
  brand_id: string;
  identity_mark_type: IdentityMarkType;
  palette_rule: PaletteRuleType;
  bottle_color_primary_hex: string | null;
  typography_primary_hex: string | null;
  typography_secondary_hex: string | null;
  accent_color_hex: string | null;
  dual_delivery_mark_primary_hex: string | null;
  dual_delivery_mark_outline_hex: string | null;
  tagline_primary: string;
  tagline_subtitle: string | null;
  display_order: number;
  default_commission_rate_pct: number | null;
}

export interface SkuPaletteOverrides {
  sku_bottle_color_primary_hex: string | null;
  sku_typography_primary_hex: string | null;
  sku_typography_secondary_hex: string | null;
  sku_accent_color_hex: string | null;
  sku_dd_mark_primary_hex: string | null;
  sku_dd_mark_outline_hex: string | null;
}

export const CATEGORY_IDENTITY_MARK: Record<CategorySlug, IdentityMarkType> = {
  base_formulas:         'methylated_formula',
  advanced_formulas:     'dual_delivery_technology',
  womens_health:         'dual_delivery_technology',
  childrens_methylated:  'methylated_formula',
  snp_support:           'dual_delivery_technology',
  functional_mushrooms:  'dual_delivery_technology',
  genex360_testing:      'none',
};

export const CATEGORY_PALETTE_RULE: Record<CategorySlug, PaletteRuleType> = {
  base_formulas:         'single_palette_category_wide',
  advanced_formulas:     'per_sku_palette',
  womens_health:         'single_palette_category_wide',
  childrens_methylated:  'single_palette_category_wide',
  snp_support:           'single_palette_category_wide',
  functional_mushrooms:  'per_sku_palette',
  genex360_testing:      'not_applicable',
};

export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHex(value: string | null | undefined): boolean {
  if (!value) return false;
  return HEX_COLOR_RE.test(value);
}

export interface PaletteValidationIssue {
  code:
    | 'single_palette_rejects_sku_override'
    | 'per_sku_palette_requires_bottle_and_typography'
    | 'invalid_hex';
  message: string;
}

export function validateSkuPaletteAgainstCategory(args: {
  category_palette_rule: PaletteRuleType;
  overrides: SkuPaletteOverrides;
}): PaletteValidationIssue[] {
  const issues: PaletteValidationIssue[] = [];
  const o = args.overrides;

  const anyOverride =
    o.sku_bottle_color_primary_hex ||
    o.sku_typography_primary_hex ||
    o.sku_typography_secondary_hex ||
    o.sku_accent_color_hex ||
    o.sku_dd_mark_primary_hex ||
    o.sku_dd_mark_outline_hex;

  if (args.category_palette_rule === 'single_palette_category_wide' && anyOverride) {
    issues.push({
      code: 'single_palette_rejects_sku_override',
      message: 'Category is single_palette_category_wide; per-SKU palette overrides not permitted.',
    });
  }

  if (args.category_palette_rule === 'per_sku_palette') {
    if (!o.sku_bottle_color_primary_hex || !o.sku_typography_primary_hex) {
      issues.push({
        code: 'per_sku_palette_requires_bottle_and_typography',
        message: 'Category is per_sku_palette; bottle + typography primary hex both required.',
      });
    }
  }

  const hexFields: Array<[keyof SkuPaletteOverrides, string | null]> = [
    ['sku_bottle_color_primary_hex', o.sku_bottle_color_primary_hex],
    ['sku_typography_primary_hex',   o.sku_typography_primary_hex],
    ['sku_typography_secondary_hex', o.sku_typography_secondary_hex],
    ['sku_accent_color_hex',         o.sku_accent_color_hex],
    ['sku_dd_mark_primary_hex',      o.sku_dd_mark_primary_hex],
    ['sku_dd_mark_outline_hex',      o.sku_dd_mark_outline_hex],
  ];
  for (const [field, value] of hexFields) {
    if (value !== null && value !== undefined && value !== '' && !isValidHex(value)) {
      issues.push({
        code: 'invalid_hex',
        message: `${field} must be a 6-digit hex like #A1B2C3; got "${value}".`,
      });
    }
  }

  return issues;
}

export function identityMarkAllowedForCategory(args: {
  category_slug: CategorySlug;
  identity_mark_on_packaging: IdentityMarkType;
}): boolean {
  return CATEGORY_IDENTITY_MARK[args.category_slug] === args.identity_mark_on_packaging;
}
