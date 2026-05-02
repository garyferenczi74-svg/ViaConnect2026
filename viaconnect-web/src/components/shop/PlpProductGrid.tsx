/**
 * PlpProductGrid is the client-side wrapper that reads URL search params
 * and applies them to the server-fetched product array per Prompt #141 v3
 * §6. The server fetches the full per-category product set via
 * getProductsByCategory; this component subscribes to the URL and renders
 * the filtered + sorted subset, with chip rows and the empty state.
 *
 * Counts shown on chips are computed against the un-filtered set so the
 * user can see how many products each chip would surface before clicking.
 *
 * Tertiary "Matched to Me" chip is gated by `hasCaqOnFile`; the wiring
 * for the user CAQ check lands in a later phase (the prop default of
 * false hides the row until that wiring is in place).
 */
'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { FilterChipRow } from './FilterChipRow'
import {
    DELIVERY_CHIPS,
    MATCH_CHIPS,
    PRIMARY_CHIPS_BY_CATEGORY,
    applyFilters,
    applySort,
    countByDelivery,
    countByPrimary,
    readFilterState,
} from '@/lib/shop/filters'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ShopProduct } from '@/lib/shop/queries'

interface PlpProductGridProps {
    products: ShopProduct[]
    variant: ShopCardVariant
    categorySlug: string
    hasCaqOnFile?: boolean
}

export function PlpProductGrid({
    products,
    variant,
    categorySlug,
    hasCaqOnFile,
}: PlpProductGridProps) {
    const searchParams = useSearchParams()

    const filters = useMemo(
        () => readFilterState(new URLSearchParams(searchParams.toString())),
        [searchParams],
    )

    const primaryChips = PRIMARY_CHIPS_BY_CATEGORY[categorySlug] ?? []
    const primaryCounts = useMemo(
        () => countByPrimary(products, primaryChips, categorySlug),
        [products, primaryChips, categorySlug],
    )
    const deliveryCounts = useMemo(
        () => countByDelivery(products, DELIVERY_CHIPS),
        [products],
    )

    const visibleProducts = useMemo(() => {
        const filtered = applyFilters(products, filters, categorySlug)
        return applySort(filtered, filters.sort)
    }, [products, filters, categorySlug])

    // Single-open accordion across the grid per Prompt #144 v2 §3.1: opening
    // one card's Formulation/TestingMeta dropdown collapses any other open
    // card. Tracks the currently open product id; null means none open.
    const [openCardId, setOpenCardId] = useState<string | null>(null)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                {primaryChips.length > 0 && (
                    <FilterChipRow
                        paramName="primary"
                        chips={primaryChips}
                        counts={primaryCounts}
                    />
                )}
                <FilterChipRow paramName="delivery" chips={DELIVERY_CHIPS} counts={deliveryCounts} />
                {hasCaqOnFile && <FilterChipRow paramName="match" chips={MATCH_CHIPS} />}
            </div>

            {visibleProducts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-sm">
                    <p className="text-base text-white/65">
                        {products.length === 0
                            ? 'Products in this category are coming online. Check back soon.'
                            : 'No products match the current filters. Try clearing one or two.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8 xl:grid-cols-4">
                    {visibleProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            variant={variant}
                            href={`/shop/product/${product.slug ?? product.sku}`}
                            isFormulationOpen={openCardId === product.id}
                            onToggleFormulation={() =>
                                setOpenCardId((prev) => (prev === product.id ? null : product.id))
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
