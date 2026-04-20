// Prompt #103 Phase 3: Build the Claude Vision validation prompt.
//
// The prompt is category-aware: it loads the category's identity-mark
// rule, palette rule, and tagline and tells the model exactly what to
// check. Output is a strict JSON object the Edge Function can parse
// without a language-model roundtrip.

import type { ProductCategory, CategorySlug } from '../categories/types';
import { expectedTaglineForBrand, type Brand } from '../brands/types';
import { COMPLIANCE_ISSUE_CODES } from './types';

export interface PromptBuilderInput {
  product: {
    id: string;
    name: string;
    serving_count: number | null;
    serving_unit: string | null;
    dose_per_serving_text: string | null;
    sku_bottle_color_primary_hex: string | null;
    sku_typography_primary_hex: string | null;
  };
  brand: Pick<Brand, 'brand_slug' | 'display_name' | 'wordmark_style' | 'master_tagline'>;
  category: Pick<ProductCategory,
    'category_slug' | 'display_name' | 'identity_mark_type' | 'palette_rule' |
    'bottle_color_primary_hex' | 'typography_primary_hex' | 'accent_color_hex' |
    'dual_delivery_mark_primary_hex' | 'dual_delivery_mark_outline_hex' |
    'tagline_primary'
  >;
  assigned_certification_slugs: string[];
}

function identityMarkDescription(slug: CategorySlug | string): string {
  if (slug === 'base_formulas' || slug === 'childrens_methylated') {
    return 'Methylated Formula badge (7-dot hexagonal molecular mark) MUST be present. Dual Delivery Technology two-circle mark MUST NOT be present.';
  }
  if (slug === 'advanced_formulas' || slug === 'womens_health' || slug === 'snp_support' || slug === 'functional_mushrooms') {
    return 'Dual Delivery Technology™ two-circle mark MUST be present with the ™ symbol. Methylated Formula badge MUST NOT be present.';
  }
  if (slug === 'genex360_testing') {
    return 'Neither Methylated Formula badge NOR Dual Delivery Technology mark should appear; this is a test kit, not a supplement.';
  }
  return 'Category rules unknown.';
}

function paletteExpectation(input: PromptBuilderInput): string {
  const c = input.category;
  if (c.palette_rule === 'single_palette_category_wide') {
    return [
      `Dominant bottle color should match ${c.bottle_color_primary_hex ?? '(unset)'}.`,
      `Primary typography color should match ${c.typography_primary_hex ?? '(unset)'}.`,
      `Accent color should match ${c.accent_color_hex ?? '(unset)'}.`,
    ].join(' ');
  }
  if (c.palette_rule === 'per_sku_palette') {
    return [
      `Per-SKU palette: bottle ${input.product.sku_bottle_color_primary_hex ?? '(unset)'}`,
      `typography primary ${input.product.sku_typography_primary_hex ?? '(unset)'}.`,
      'The palette does NOT need to match the category default for this category.',
    ].join(' ');
  }
  return 'Not applicable (test kit format).';
}

export function buildValidationPrompt(input: PromptBuilderInput): string {
  const expectedTagline = expectedTaglineForBrand(input.brand);

  return [
    'You are the ViaCura / Sproutables Brand Identity Compliance reviewer.',
    'Audit the attached packaging proof image for the product below and return JSON only.',
    '',
    '## Product context',
    `- Name: ${input.product.name}`,
    `- Brand: ${input.brand.display_name} (wordmark style: ${input.brand.wordmark_style})`,
    `- Category: ${input.category.display_name} (slug: ${input.category.category_slug})`,
    `- Expected tagline (exact): "${expectedTagline}"`,
    `- Serving: ${input.product.serving_count ?? '?'} ${input.product.serving_unit ?? '?'}`,
    `- Dose text: ${input.product.dose_per_serving_text ?? '(unset)'}`,
    `- Assigned certifications: ${input.assigned_certification_slugs.join(', ') || 'none'}`,
    '',
    '## Identity-mark rule',
    identityMarkDescription(input.category.category_slug as CategorySlug),
    '',
    '## Palette rule',
    paletteExpectation(input),
    '',
    '## Wordmark rules',
    input.brand.brand_slug === 'sproutables'
      ? '- Sproutables packaging MUST NOT render the VIACURA wordmark anywhere. The Sproutables wordmark with leaf figure is the only permitted brand wordmark on this proof.'
      : input.brand.brand_slug === 'viacura-snp'
        ? '- SNP Line uses monochrome VIACURA wordmark (gold on matte black). No Sproutables wordmark should appear.'
        : '- ViaCura uses the bi-tonal VIA (copper/gray) / CURA (green/family-specific) wordmark. No Sproutables wordmark should appear.',
    '',
    '## Prohibited',
    '- No emojis anywhere.',
    '- No DNA helix icons.',
    '- No circular "Precision" badges.',
    '- No unsubstantiated claims ("Revolutionary", "Miraculous", "Cures", etc.).',
    '',
    '## Output',
    'Respond with a single JSON object of this exact shape:',
    '{',
    '  "issues": [ { "code": "<one of the enum values>", "severity": "minor|major|critical", "message": "<short human-readable>", "bbox": { "x": 0, "y": 0, "w": 0, "h": 0 } } ]',
    '}',
    `Valid code values: ${COMPLIANCE_ISSUE_CODES.join(', ')}.`,
    'If the proof is fully compliant, return { "issues": [] }.',
    'Do not include any text outside the JSON object.',
  ].join('\n');
}
