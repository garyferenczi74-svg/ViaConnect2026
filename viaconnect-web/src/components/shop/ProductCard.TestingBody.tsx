/**
 * Testing card body (Variant B) per Prompt #141 v3 §4.3, restructured
 * per Prompt #144 v2 §3.4.
 *
 * Slots top to bottom: panel name, blurb, price, FullDescriptionLink
 * (label "Full Panel Details"), TestingMetaDropdown rendering 3 sections
 * What's Tested / Who It's For / What You Get from products.testing_meta,
 * Add to Cart (or Order Test Kit when products.requires_practitioner_order
 * is true).
 *
 * Single-open accordion: isFormulationOpen + onToggleFormulation are
 * passed down from <PlpProductGrid>; same prop names used as supplement
 * variant for grid-level coordination simplicity.
 */
'use client'

import { ShoppingBag } from 'lucide-react'
import { FullDescriptionLink } from './FullDescriptionLink'
import { TestingMetaDropdown } from './TestingMetaDropdown'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopProduct } from '@/lib/shop/queries'

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

interface ProductCardTestingBodyProps {
    product: ShopProduct
    isFormulationOpen: boolean
    onToggleFormulation: () => void
}

export function ProductCardTestingBody({
    product,
    isFormulationOpen,
    onToggleFormulation,
}: ProductCardTestingBodyProps) {
    const displayPrice = product.price_msrp ?? product.price
    const summary = product.summary ?? ''
    const ctaCopy = product.requires_practitioner_order ? 'Order Test Kit' : 'Add to Cart'
    const slug = product.slug ?? product.sku

    return (
        <div className="flex flex-col gap-3 p-4">
            <h3 className="text-lg font-medium tracking-tight text-white">{product.name}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">
                {summary || 'Description coming soon.'}
            </p>
            <p className="text-base font-medium text-white/75">{formatPrice(displayPrice)}</p>

            <div className="mt-auto flex flex-col gap-2">
                <FullDescriptionLink slug={slug} categorySlug={product.category_slug} />
                <TestingMetaDropdown
                    testingMeta={product.testing_meta}
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
                            productType: 'testing',
                        },
                        { openDrawer: true },
                    )
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
            >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {ctaCopy}
            </button>
        </div>
    )
}
