/**
 * Supplement card body (Variant A) per Prompt #141 v3 §4.2, restructured
 * per Prompt #144 v2 §3.1.
 *
 * Slots top to bottom: name, format, price, short blurb, FullDescriptionLink,
 * FormulationDropdown, Add to Cart. The blurb stays in place when the
 * dropdown expands (no content swap; layout pushes downward instead).
 *
 * Single-open accordion: isFormulationOpen + onToggleFormulation are
 * passed down from <PlpProductGrid> so opening one card's Formulation
 * collapses any other open card across the grid.
 *
 * The Add to Cart button stops the card-wide Link from navigating so
 * direct cart adds work without leaving the PLP. Cart wiring lands in
 * Phase F (cart drawer plus checkout); for now it logs the SKU.
 */
'use client'

import { ShoppingBag } from 'lucide-react'
import { FormatIndicator } from './FormatIndicator'
import { FormulationDropdown } from './FormulationDropdown'
import { FullDescriptionLink } from './FullDescriptionLink'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopProduct } from '@/lib/shop/queries'

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

interface ProductCardSupplementBodyProps {
    product: ShopProduct
    isFormulationOpen: boolean
    onToggleFormulation: () => void
}

export function ProductCardSupplementBody({
    product,
    isFormulationOpen,
    onToggleFormulation,
}: ProductCardSupplementBodyProps) {
    const displayPrice = product.price_msrp ?? product.price
    const summary = product.summary ?? ''
    const description = product.description ?? ''
    const slug = product.slug ?? product.sku

    return (
        <div className="flex flex-col gap-3 p-4">
            <h3 className="text-lg font-medium tracking-tight text-white">{product.name}</h3>
            <FormatIndicator format={product.format} />
            <p className="text-base font-medium text-white/75">{formatPrice(displayPrice)}</p>

            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">
                {summary || description || 'Description coming soon.'}
            </p>

            <div className="mt-auto flex flex-col gap-2">
                <FullDescriptionLink slug={slug} categorySlug={product.category_slug} />
                <FormulationDropdown
                    ingredients={product.ingredients}
                    totalMgPerServing={null}
                    isOpen={isFormulationOpen}
                    onToggle={onToggleFormulation}
                />
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    addToCart(
                        {
                            sku: product.sku,
                            productId: product.id,
                            name: product.name,
                            format: product.format,
                            image:
                                (product.image_urls && product.image_urls[0]) ||
                                product.image_url ||
                                null,
                            price: product.price_msrp ?? product.price ?? 0,
                            pricingTier: product.pricing_tier ?? null,
                            productType: 'supplement',
                        },
                        { openDrawer: true },
                    )
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
            >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                Add to Cart
            </button>
        </div>
    )
}
