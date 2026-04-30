/**
 * Testing card body (Variant B) per Prompt #141 v3 §4.3.
 * Slots top to bottom: panel name, panel description, price, tab strip,
 * tab-controlled info panel, Add to Cart button (or Order Test Kit when
 * products.requires_practitioner_order is true).
 *
 * The Add to Cart button is a Phase C stub. Cart wiring lands in Phase F.
 */
'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { CardTabStrip } from './CardTabStrip'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopProduct } from '@/lib/shop/queries'

type TestingTabKey = 'what_is_tested' | 'who_its_for' | 'what_you_get'

const TESTING_TABS = [
    { key: 'what_is_tested', label: "What's Tested" },
    { key: 'who_its_for', label: "Who It's For" },
    { key: 'what_you_get', label: 'What You Get' },
]

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

interface ProductCardTestingBodyProps {
    product: ShopProduct
}

export function ProductCardTestingBody({ product }: ProductCardTestingBodyProps) {
    const [activeTab, setActiveTab] = useState<TestingTabKey>('what_is_tested')
    const displayPrice = product.price_msrp ?? product.price
    const summary = product.summary ?? ''
    const meta = product.testing_meta ?? {}
    const ctaCopy = product.requires_practitioner_order ? 'Order Test Kit' : 'Add to Cart'
    const tabContent = meta[activeTab] ?? 'Details coming soon.'

    return (
        <div className="flex flex-col gap-2 p-4">
            <h3 className="text-lg font-medium text-white tracking-tight">{product.name}</h3>
            <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                {summary || 'Description coming soon.'}
            </p>
            <p className="text-base text-white/75 font-medium">{formatPrice(displayPrice)}</p>

            <CardTabStrip
                tabs={TESTING_TABS}
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as TestingTabKey)}
                className="mt-2"
            />

            <p className="text-sm text-white/70 leading-relaxed line-clamp-4 min-h-[5rem]">
                {tabContent}
            </p>

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
                            image: (product.image_urls && product.image_urls[0]) || product.image_url || null,
                            price: product.price_msrp ?? product.price ?? 0,
                            pricingTier: product.pricing_tier ?? null,
                            productType: 'testing',
                        },
                        { openDrawer: true },
                    )
                }}
                className="mt-2 flex items-center justify-center gap-2 w-full bg-[#2DA5A0] hover:bg-[#26918d] text-white font-medium py-3 rounded-xl transition-colors"
            >
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                {ctaCopy}
            </button>
        </div>
    )
}
