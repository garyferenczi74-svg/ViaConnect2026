/**
 * PlpProductGrid is the client-side wrapper that renders the per-category
 * product grid. The dual filter pill rows (primary chips + delivery chips +
 * optional match chip) were removed per Prompt #146 2026-05-02 since both
 * rows showed mostly non-discriminating or zero counts and signaled filter
 * capability that did not exist on the underlying taxonomy.
 *
 * Sort + search + price + in-stock + rx-required URL filters from
 * <FilterSortDrawer> still apply via lib/shop/filters.ts applyFilters +
 * applySort. The chip-specific URL params (primary, delivery, match) are
 * dropped from the filter state since their UI is gone.
 *
 * Single-open accordion across the grid for the FormulationDropdown +
 * TestingMetaDropdown components per Prompt #144 v2 §3.1: opening one
 * card's dropdown collapses any other open card.
 */
'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { PlpProductsRetryButton } from './PlpProductsRetryButton'
import { applyFilters, applySort, readFilterState } from '@/lib/shop/filters'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ProductsByCategoryResult, ShopProduct } from '@/lib/shop/queries'
import {
    PLP_PRODUCTS_COMING_ONLINE_COPY,
    PLP_PRODUCTS_LOAD_ERROR_MESSAGE,
} from '@/lib/shop/plp-copy'

interface PlpProductGridProps {
    result: ProductsByCategoryResult
    variant: ShopCardVariant
    categorySlug: string
    signedIn: boolean
    joinedProductIds: readonly string[]
}

export function PlpProductGrid({
    result,
    variant,
    categorySlug,
    signedIn,
    joinedProductIds,
}: PlpProductGridProps) {
    if (result.status === 'error') {
        return (
            <div className="flex flex-col gap-6">
                <div
                    role="alert"
                    data-testid="plp-products-error"
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-sm"
                >
                    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                        <AlertCircle
                            className="h-6 w-6 text-rose-400"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        <p className="text-base text-white/65">{PLP_PRODUCTS_LOAD_ERROR_MESSAGE}</p>
                        <PlpProductsRetryButton />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <PlpProductGridLoaded
            products={result.products}
            variant={variant}
            categorySlug={categorySlug}
            signedIn={signedIn}
            joinedProductIds={joinedProductIds}
        />
    )
}

function PlpProductGridLoaded({
    products,
    variant,
    categorySlug,
    signedIn,
    joinedProductIds,
}: {
    products: ShopProduct[]
    variant: ShopCardVariant
    categorySlug: string
    signedIn: boolean
    joinedProductIds: readonly string[]
}) {
    const searchParams = useSearchParams()

    const filters = useMemo(
        () => readFilterState(new URLSearchParams(searchParams.toString())),
        [searchParams],
    )

    const visibleProducts = useMemo(() => {
        const filtered = applyFilters(products, filters, categorySlug)
        return applySort(filtered, filters.sort)
    }, [products, filters, categorySlug])

    const [openCardId, setOpenCardId] = useState<string | null>(null)
    const joinedIds = useMemo(() => new Set(joinedProductIds), [joinedProductIds])

    return (
        <div className="flex flex-col gap-6">
            {visibleProducts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-sm">
                    <p className="text-base text-white/65">
                        {products.length === 0
                            ? PLP_PRODUCTS_COMING_ONLINE_COPY
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
                            waitlist={{
                                signedIn,
                                joined: joinedIds.has(product.id),
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
