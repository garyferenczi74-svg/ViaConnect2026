/**
 * Canonical seven Via Cura shop categories per Prompt #141 v3 §3.
 * Used by router slugs, breadcrumbs, sitemap, and the bento landing.
 *
 * The same data is seeded into public.categories on Supabase by migration
 * 20260429000000_prompt_141v3_shop_schema_extensions.sql. This module is the
 * client-safe TypeScript mirror; queries that need DB-fresh data should use
 * lib/shop/queries.ts -> getShopCategories() instead.
 *
 * Order of this array is the canonical nav and sitemap order. The bento
 * landing layout in spec §5.1 places `methylation-snp` in the hero slot
 * regardless of this ordering; bento positioning is hard-coded in the
 * landing component, not driven by display_order.
 *
 * Peptides are deliberately absent from this array per spec §1B. Peptide
 * SKUs live on their own untouched destination page and never appear in
 * any of the seven shop PLPs, the bento landing, or shop search.
 */

export type ShopCardVariant = 'supplement' | 'testing'

export interface ShopCategory {
    slug: string
    name: string
    tagline: string
    cardVariant: ShopCardVariant
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
    {
        slug: 'base-formulations',
        name: 'Base formulas',
        tagline: 'Core building blocks. The foundation of every Via Cura protocol.',
        cardVariant: 'supplement',
    },
    {
        slug: 'advanced-formulas',
        name: 'Advanced Formulas',
        tagline: 'Targeted protocols for performance, longevity, and health optimization.',
        cardVariant: 'supplement',
    },
    {
        slug: 'womens-health',
        name: "Women's Health",
        tagline: 'Hormonal balance, prenatal, postnatal, and female wellness formulas.',
        cardVariant: 'supplement',
    },
    {
        slug: 'childrens-formulations',
        name: "Children's Formulations",
        tagline: 'Age-appropriate methylated nutrition for infants, toddlers, and children.',
        cardVariant: 'supplement',
    },
    {
        slug: 'methylation-snp',
        name: 'Methylation SNP Support',
        tagline: 'Precision formulas targeting MTHFR, COMT, VDR, and 80+ genetic variants.',
        cardVariant: 'supplement',
    },
    {
        slug: 'genex360',
        name: 'GeneX360 Testing and Diagnostics',
        tagline: 'Genetic, hormone, and biological age testing for personalized protocols.',
        cardVariant: 'testing',
    },
    {
        slug: 'functional-mushrooms',
        name: 'Functional Mushrooms',
        tagline: 'Adaptogenic mushroom extracts for immune, cognitive, and metabolic support.',
        cardVariant: 'supplement',
    },
] as const

export const SHOP_CATEGORY_SLUGS = SHOP_CATEGORIES.map((c) => c.slug)

export function getShopCategoryBySlug(slug: string): ShopCategory | undefined {
    return SHOP_CATEGORIES.find((c) => c.slug === slug)
}

export function isValidShopCategorySlug(slug: string): boolean {
    return SHOP_CATEGORIES.some((c) => c.slug === slug)
}
