// Prompt #103 Phase 1: Brand hierarchy type model.
//
// Matches the SQL brands table. ViaCura is the master brand; ViaCura
// SNP Line is a sub-line under it (is_sub_line=true, shares the
// ViaCura parent_brand_id). Sproutables is a separate top-level
// sub-brand that must never render the VIACURA wordmark.

export const BRAND_SLUGS = ['viacura', 'viacura-snp', 'sproutables'] as const;
export type BrandSlug = (typeof BRAND_SLUGS)[number];

export const WORDMARK_STYLES = [
  'bi_tonal_via_cura',
  'monochrome_via_cura',
  'sproutables_leaf_figure',
] as const;
export type WordmarkStyle = (typeof WORDMARK_STYLES)[number];

export interface Brand {
  brand_id: string;
  brand_slug: BrandSlug | string;
  display_name: string;
  parent_brand_id: string | null;
  is_sub_line: boolean;
  wordmark_style: WordmarkStyle;
  master_tagline: string;
  logo_storage_path: string | null;
  wordmark_vector_path: string | null;
  storefront_slug: string;
  storefront_theme_json: Record<string, unknown>;
}

export const MASTER_TAGLINE = 'Built For Your Biology';
export const SNP_TAGLINE = 'Your Genetics | Your Protocol';
export const SPROUTABLES_TAGLINE = 'Peak Growth and Wellness';

export function isSproutablesBrand(brand: Pick<Brand, 'brand_slug'>): boolean {
  return brand.brand_slug === 'sproutables';
}

export function isSnpSubLine(brand: Pick<Brand, 'brand_slug' | 'is_sub_line'>): boolean {
  return brand.brand_slug === 'viacura-snp' && brand.is_sub_line === true;
}

export function expectedTaglineForBrand(brand: Pick<Brand, 'brand_slug'>): string {
  if (brand.brand_slug === 'sproutables') return SPROUTABLES_TAGLINE;
  if (brand.brand_slug === 'viacura-snp') return SNP_TAGLINE;
  return MASTER_TAGLINE;
}
