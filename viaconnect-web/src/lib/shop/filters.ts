/**
 * Filter and sort configuration + logic for the shop PLPs per Prompt #141 v3 §6.
 *
 * Per-category primary chip rows (§6.1) live here as a static map. Secondary
 * delivery chips (§6.2) are common to all categories. Tertiary "Matched to
 * Me" toggle (§6.3) only renders when the user has a CAQ on file; that
 * gating happens at the component layer.
 *
 * Filter application is client-side for Phase E3 v1: the server fetches the
 * full per-category product set, the client filters via URL search params.
 * Sort options that depend on data not yet populated (created_at, gene
 * match score) degrade gracefully until backfill ships.
 *
 * Peptide exclusion is enforced upstream in lib/shop/queries.ts; filters
 * here only narrow the already-peptide-free set per spec §1B.
 */
import type { ShopProduct } from './queries'

export interface FilterChip {
    key: string
    label: string
}

export const PRIMARY_CHIPS_BY_CATEGORY: Record<string, FilterChip[]> = {
    'base-formulations': [
        { key: 'all', label: 'All' },
        { key: 'vitamins', label: 'Vitamins' },
        { key: 'minerals', label: 'Minerals' },
        { key: 'amino-acids', label: 'Amino Acids' },
        { key: 'cofactors', label: 'Cofactors' },
        { key: 'bundles', label: 'Bundles' },
    ],
    'advanced-formulas': [
        { key: 'all', label: 'All' },
        { key: 'performance', label: 'Performance' },
        { key: 'longevity', label: 'Longevity' },
        { key: 'recovery', label: 'Recovery' },
        { key: 'cognitive', label: 'Cognitive' },
        { key: 'metabolic', label: 'Metabolic' },
    ],
    'womens-health': [
        { key: 'all', label: 'All' },
        { key: 'preconception', label: 'Preconception' },
        { key: 'prenatal', label: 'Prenatal' },
        { key: 'postnatal', label: 'Postnatal' },
        { key: 'cycle-support', label: 'Cycle Support' },
        { key: 'perimenopause', label: 'Perimenopause' },
        { key: 'menopause', label: 'Menopause' },
    ],
    'childrens-formulations': [
        { key: 'all', label: 'All' },
        { key: 'infant', label: 'Infant 0 to 12 mo' },
        { key: 'toddler', label: 'Toddler 1 to 3 yr' },
        { key: 'child', label: 'Child 4 to 12 yr' },
        { key: 'teen', label: 'Teen 13 to 17 yr' },
    ],
    'methylation-snp': [
        { key: 'all', label: 'All' },
        { key: 'mthfr', label: 'MTHFR' },
        { key: 'comt', label: 'COMT' },
        { key: 'vdr', label: 'VDR' },
        { key: 'mtrr', label: 'MTRR' },
        { key: 'mtr', label: 'MTR' },
        { key: 'bhmt', label: 'BHMT' },
        { key: 'cbs', label: 'CBS' },
        { key: 'combo', label: 'Combo' },
    ],
    genex360: [
        { key: 'all', label: 'All' },
        { key: 'genetic', label: 'Genetic' },
        { key: 'hormone', label: 'Hormone' },
        { key: 'biological-age', label: 'Biological Age' },
        { key: 'bundles', label: 'Bundles' },
    ],
    'functional-mushrooms': [
        { key: 'all', label: 'All' },
        { key: 'lions-mane', label: "Lion's Mane" },
        { key: 'reishi', label: 'Reishi' },
        { key: 'cordyceps', label: 'Cordyceps' },
        { key: 'chaga', label: 'Chaga' },
        { key: 'turkey-tail', label: 'Turkey Tail' },
        { key: 'multi-blend', label: 'Multi-Blend' },
    ],
}

// Secondary chip row per spec §6.2 (all categories).
// Injection and Nasal Spray deliberately omitted because both delivery
// methods are predominantly peptide-related, and peptides are out of scope
// for this shop per spec §1B.
export const DELIVERY_CHIPS: FilterChip[] = [
    { key: 'all', label: 'All' },
    { key: 'liposomal', label: 'Liposomal' },
    { key: 'micellar', label: 'Micellar' },
    { key: 'standard', label: 'Standard' },
    { key: 'tincture', label: 'Tincture' },
    { key: 'powder', label: 'Powder' },
    { key: 'sublingual', label: 'Sublingual' },
]

// Tertiary toggle per spec §6.3 (rendered only when user has CAQ on file).
export const MATCH_CHIPS: FilterChip[] = [
    { key: 'all', label: 'All' },
    { key: 'matched', label: 'Matched to Me' },
    { key: 'generic', label: 'Generic' },
]

export interface SortOption {
    key: string
    label: string
    requiresCaq?: boolean
}

export const SORT_OPTIONS: SortOption[] = [
    { key: 'featured', label: 'Featured' },
    { key: 'price-asc', label: 'Price low to high' },
    { key: 'price-desc', label: 'Price high to low' },
    { key: 'newest', label: 'Newest' },
    { key: 'best-match', label: 'Best gene match', requiresCaq: true },
]

export interface ShopFilterState {
    primary?: string
    delivery?: string
    match?: string
    sort?: string
    q?: string
    inStock?: boolean
    rxRequired?: boolean
    priceMin?: number
    priceMax?: number
}

export function readFilterState(searchParams: URLSearchParams): ShopFilterState {
    const get = (k: string) => {
        const v = searchParams.get(k)
        return v === null || v === '' ? undefined : v
    }
    const num = (k: string) => {
        const v = get(k)
        if (v === undefined) return undefined
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
    }
    return {
        primary: get('primary'),
        delivery: get('delivery'),
        match: get('match'),
        sort: get('sort'),
        q: get('q'),
        inStock: get('in_stock') === '1',
        rxRequired: get('rx_required') === '1',
        priceMin: num('price_min'),
        priceMax: num('price_max'),
    }
}

function matchesPrimary(
    product: ShopProduct,
    primary: string,
    categorySlug: string | undefined,
): boolean {
    if (!primary || primary === 'all') return true
    // Methylation SNP Support is the only category whose primary chips map
    // to a fielded product attribute today. Other categories would require
    // a backfill that populates a `subcategory_slug` or extends `status_tags`
    // before their chips become true narrowing filters.
    if (categorySlug === 'methylation-snp') {
        const targets = (product.snp_targets ?? []).map((t) => t.toUpperCase())
        if (primary === 'combo') return targets.length >= 2
        return targets.includes(primary.toUpperCase())
    }
    // No-op pending backfill. Returns true so chips render but do not narrow.
    return true
}

export function applyFilters(
    products: ShopProduct[],
    filters: ShopFilterState,
    categorySlug: string | undefined,
): ShopProduct[] {
    let result = products

    if (filters.primary && filters.primary !== 'all') {
        result = result.filter((p) => matchesPrimary(p, filters.primary as string, categorySlug))
    }

    if (filters.delivery && filters.delivery !== 'all') {
        result = result.filter(
            (p) => (p.format ?? '').toLowerCase() === (filters.delivery as string).toLowerCase(),
        )
    }

    if (filters.rxRequired) {
        result = result.filter((p) => (p.status_tags ?? []).includes('RX REQUIRED'))
    }

    if (filters.priceMin != null) {
        const min = filters.priceMin
        result = result.filter((p) => (p.price_msrp ?? p.price ?? 0) >= min)
    }
    if (filters.priceMax != null) {
        const max = filters.priceMax
        result = result.filter((p) => (p.price_msrp ?? p.price ?? 0) <= max)
    }

    if (filters.q && filters.q.trim()) {
        const q = filters.q.trim().toLowerCase()
        result = result.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.summary ?? '').toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q),
        )
    }

    return result
}

export function applySort(products: ShopProduct[], sort: string | undefined): ShopProduct[] {
    if (!sort || sort === 'featured') return products
    const result = [...products]
    switch (sort) {
        case 'price-asc':
            result.sort((a, b) => (a.price_msrp ?? a.price ?? 0) - (b.price_msrp ?? b.price ?? 0))
            return result
        case 'price-desc':
            result.sort((a, b) => (b.price_msrp ?? b.price ?? 0) - (a.price_msrp ?? a.price ?? 0))
            return result
        case 'newest':
            // Requires created_at on ShopProduct; falls back to current order.
            return result
        case 'best-match':
            result.sort((a, b) => (b.gene_match_score ?? 0) - (a.gene_match_score ?? 0))
            return result
        default:
            return result
    }
}

// Compute count for each chip key against the un-filtered product set.
// Used by FilterChipRow to render `MTHFR (12)` style suffixes per spec §6.5.
export function countByPrimary(
    products: ShopProduct[],
    chips: FilterChip[],
    categorySlug: string | undefined,
): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const chip of chips) {
        if (chip.key === 'all') {
            counts[chip.key] = products.length
        } else {
            counts[chip.key] = products.filter((p) =>
                matchesPrimary(p, chip.key, categorySlug),
            ).length
        }
    }
    return counts
}

export function countByDelivery(
    products: ShopProduct[],
    chips: FilterChip[],
): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const chip of chips) {
        if (chip.key === 'all') {
            counts[chip.key] = products.length
        } else {
            counts[chip.key] = products.filter(
                (p) => (p.format ?? '').toLowerCase() === chip.key.toLowerCase(),
            ).length
        }
    }
    return counts
}
