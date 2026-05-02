/**
 * FullCardMobileStickyCart renders the bottom-fixed quantity stepper plus
 * Add to Cart plus Add to Bundle bar shown only on mobile per Prompt #144 v2
 * §6.3. Desktop full card has no purchase action; the user is already
 * deeply committed to the product (long-form scroll) and can use the
 * preview PDP for desktop purchase flow if needed.
 *
 * Reuses the same addToCart store + variant routing as PdpRightRail.
 */
'use client'

import { useState } from 'react'
import { Bookmark, Minus, Plus, ShoppingBag } from 'lucide-react'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopProduct } from '@/lib/shop/queries'

interface FullCardMobileStickyCartProps {
    product: ShopProduct
    variant: 'supplement' | 'testing'
}

export function FullCardMobileStickyCart({
    product,
    variant,
}: FullCardMobileStickyCartProps) {
    const [quantity, setQuantity] = useState<number>(1)
    const ctaCopy =
        variant === 'testing' && product.requires_practitioner_order
            ? 'Order Test Kit'
            : 'Add to Cart'

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#1A2744]/95 px-4 py-3 backdrop-blur-md md:hidden">
            <div className="flex items-center gap-3">
                {variant === 'supplement' && (
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
                        >
                            <Minus className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums text-white">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                            className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
                        >
                            <Plus className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() =>
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
                                quantity,
                                pricingTier: product.pricing_tier ?? null,
                                productType: variant,
                            },
                            { openDrawer: true },
                        )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
                >
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                    <span className="text-sm">{ctaCopy}</span>
                </button>
                {variant === 'supplement' && (
                    <button
                        type="button"
                        onClick={() =>
                            console.info('[shop] Full card Add to Bundle (stub)', {
                                sku: product.sku,
                            })
                        }
                        aria-label="Add to Bundle"
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08]"
                    >
                        <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                )}
            </div>
        </div>
    )
}
