/**
 * Filter and sort configuration + logic for the shop PLPs.
 *
 * Per Prompt #146 2026-05-02 the dual pill filter rows (primary chips +
 * delivery chips + optional match chip) were removed from the catalog
 * pages since both rows signaled filter capability that did not exist on
 * the underlying taxonomy. The chip definitions plus PRIMARY_CHIPS_BY_CATEGORY
 * plus DELIVERY_CHIPS plus MATCH_CHIPS plus countByPrimary plus countByDelivery
 * plus the FilterChip type plus the matchesPrimary helper plus the
 * primary/delivery/match fields on ShopFilterState were dropped together.
 *
 * What remains: sort + search + price range + in-stock + rx-required
 * filters driven by <FilterSortDrawer> URL params. applyFilters + applySort
 * + readFilterState handle those.
 *
 * Peptide exclusion is enforced upstream in lib/shop/queries.ts; filters
 * here only narrow the already-peptide-free set per spec §1B.
 */
import type { ShopProduct } from './queries'

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
        sort: get('sort'),
        q: get('q'),
        inStock: get('in_stock') === '1',
        rxRequired: get('rx_required') === '1',
        priceMin: num('price_min'),
        priceMax: num('price_max'),
    }
}

export function applyFilters(
    products: ShopProduct[],
    filters: ShopFilterState,
    _categorySlug: string | undefined,
): ShopProduct[] {
    let result = products

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
            return result
        case 'best-match':
            result.sort((a, b) => (b.gene_match_score ?? 0) - (a.gene_match_score ?? 0))
            return result
        default:
            return result
    }
}
