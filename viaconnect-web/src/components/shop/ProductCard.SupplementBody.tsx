/**
 * Supplement card body (Variant A) per Prompt #141 v3 §4.2.
 * Slots top to bottom: name, format, price, swappable description vs
 * formulation panel, tab strip, Add to Cart button.
 *
 * The Add to Cart button is a Phase C stub. Cart wiring lands in Phase F
 * (cart drawer + checkout). For now it logs the SKU and stops the card-wide
 * Link from navigating.
 */
'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { CardTabStrip } from './CardTabStrip'
import { FormatIndicator } from './FormatIndicator'
import type { ShopProduct } from '@/lib/shop/queries'

const SUPPLEMENT_TABS = [
    { key: 'description', label: 'Description' },
    { key: 'formulation', label: 'Formulation' },
]

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

interface ProductCardSupplementBodyProps {
    product: ShopProduct
}

export function ProductCardSupplementBody({ product }: ProductCardSupplementBodyProps) {
    const [activeTab, setActiveTab] = useState<string>('description')
    const displayPrice = product.price_msrp ?? product.price
    const summary = product.summary ?? ''
    const description = product.description ?? ''
    const ingredients = product.ingredients ?? []

    return (
        <div className="flex flex-col gap-2 p-4">
            <h3 className="text-lg font-medium text-white tracking-tight">{product.name}</h3>
            <FormatIndicator format={product.format} />
            <p className="text-base text-white/75 font-medium">{formatPrice(displayPrice)}</p>

            {activeTab === 'description' ? (
                <p className="text-sm text-white/70 leading-relaxed line-clamp-4 min-h-[5rem]">
                    {summary || description || 'Description coming soon.'}
                </p>
            ) : (
                <div className="text-sm text-white/70 leading-relaxed line-clamp-4 min-h-[5rem]">
                    {ingredients.length === 0 ? (
                        <span className="text-white/45">Formulation details coming soon.</span>
                    ) : (
                        <ul className="space-y-0.5">
                            {ingredients.slice(0, 6).map((ing, i) => (
                                <li key={`${ing.name}-${i}`}>
                                    {ing.name}
                                    {ing.dose != null && ing.unit ? ` ${ing.dose} ${ing.unit}` : ''}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <CardTabStrip
                tabs={SUPPLEMENT_TABS}
                activeKey={activeTab}
                onChange={setActiveTab}
                className="mt-auto"
            />

            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.info('[shop] Add to Cart clicked', { sku: product.sku })
                }}
                className="mt-2 flex items-center justify-center gap-2 w-full bg-[#2DA5A0] hover:bg-[#26918d] text-white font-medium py-3 rounded-xl transition-colors"
            >
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                Add to Cart
            </button>
        </div>
    )
}
