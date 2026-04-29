/**
 * PdpRightRail is the interactive right column of the product detail page
 * per Prompt #141 v3 §5.3. Holds tab state, quantity stepper state, and
 * the Add to Cart / Add to Bundle buttons. Tabs are expanded compared to
 * the in-card variant: Supplement gets 4 (Description, Formulation,
 * Evidence, FAQ), Testing gets 5 (What's Tested, Who It's For, What You
 * Get, Sample Report, FAQ).
 *
 * Cart and bundle wiring lands in Phase F. Phase E2 stubs both buttons
 * with console.info and the visible UI, so the right rail is a faithful
 * preview of the final flow.
 *
 * Genetic match section renders inline when product.snp_targets has any
 * entries. The full per-user CAQ check (gene_match_score >= 0.75 AND user
 * has CAQ on file) lives in a later phase that wires in the auth context.
 */
'use client'

import { useState } from 'react'
import { Bookmark, Minus, Plus, ShoppingBag } from 'lucide-react'
import { CardTabStrip } from './CardTabStrip'
import { FormatIndicator } from './FormatIndicator'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ShopProduct } from '@/lib/shop/queries'

const SUPPLEMENT_TABS = [
    { key: 'description', label: 'Description' },
    { key: 'formulation', label: 'Formulation' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'faq', label: 'FAQ' },
]

const TESTING_TABS = [
    { key: 'what_is_tested', label: "What's Tested" },
    { key: 'who_its_for', label: "Who It's For" },
    { key: 'what_you_get', label: 'What You Get' },
    { key: 'sample_report', label: 'Sample Report' },
    { key: 'faq', label: 'FAQ' },
]

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

interface PdpRightRailProps {
    product: ShopProduct
    variant: ShopCardVariant
}

export function PdpRightRail({ product, variant }: PdpRightRailProps) {
    const tabs = variant === 'testing' ? TESTING_TABS : SUPPLEMENT_TABS
    const [activeTab, setActiveTab] = useState<string>(tabs[0].key)
    const [quantity, setQuantity] = useState<number>(1)

    const displayPrice = product.price_msrp ?? product.price
    const ctaCopy =
        variant === 'testing' && product.requires_practitioner_order ? 'Order Test Kit' : 'Add to Cart'
    const snpTargets = product.snp_targets ?? []

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-light tracking-tight text-white md:text-4xl">
                    {product.name}
                </h1>
                {variant === 'supplement' && (
                    <FormatIndicator format={product.format} className="mt-2 text-base text-white/60" />
                )}
            </div>

            <div>
                <p className="text-3xl font-medium text-white">{formatPrice(displayPrice)}</p>
                {product.bioavailability_pct != null && (
                    <p className="mt-1 text-xs text-white/55">
                        Bioavailability {product.bioavailability_pct}%
                    </p>
                )}
            </div>

            {variant === 'supplement' && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-white/70">Quantity</span>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
                        >
                            <Minus className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums text-white">
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
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={() =>
                        console.info('[shop] PDP Add to Cart', { sku: product.sku, qty: quantity })
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
                >
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                    {ctaCopy}
                </button>
                {variant === 'supplement' && (
                    <button
                        type="button"
                        onClick={() => console.info('[shop] PDP Add to Bundle', { sku: product.sku })}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3 font-medium text-white transition-colors hover:bg-white/[0.08]"
                    >
                        <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                        Add to Bundle
                    </button>
                )}
            </div>

            <div className="border-t border-white/[0.06] pt-6">
                <CardTabStrip
                    tabs={tabs}
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="overflow-x-auto"
                />
                <div className="mt-4 min-h-[8rem] text-sm leading-relaxed text-white/70">
                    <PdpTabContent product={product} variant={variant} activeTab={activeTab} />
                </div>
            </div>

            {snpTargets.length > 0 && (
                <div className="rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 p-4">
                    <p className="mb-2 text-xs uppercase tracking-wider text-[#2DA5A0]">
                        Genetic Targets
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {snpTargets.map((snp) => (
                            <span
                                key={snp}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/85"
                            >
                                {snp}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function PdpTabContent({
    product,
    variant,
    activeTab,
}: {
    product: ShopProduct
    variant: ShopCardVariant
    activeTab: string
}) {
    if (variant === 'supplement') {
        if (activeTab === 'description') {
            return (
                <p>
                    {product.description || product.summary || 'Description coming soon.'}
                </p>
            )
        }
        if (activeTab === 'formulation') {
            const ingredients = product.ingredients ?? []
            if (ingredients.length === 0) {
                return <span className="text-white/45">Formulation details coming soon.</span>
            }
            return (
                <ul className="space-y-1">
                    {ingredients.map((ing, i) => (
                        <li key={`${ing.name}-${i}`}>
                            <span className="text-white">{ing.name}</span>
                            {ing.dose != null && ing.unit && (
                                <span className="text-white/55">
                                    {' '}
                                    {ing.dose} {ing.unit}
                                </span>
                            )}
                            {ing.role && <span className="ml-2 text-white/45">({ing.role})</span>}
                        </li>
                    ))}
                </ul>
            )
        }
        return <span className="text-white/45">Coming soon.</span>
    }

    const meta = product.testing_meta ?? {}
    if (activeTab === 'what_is_tested') {
        return <p>{meta.what_is_tested ?? 'Details coming soon.'}</p>
    }
    if (activeTab === 'who_its_for') {
        return <p>{meta.who_its_for ?? 'Details coming soon.'}</p>
    }
    if (activeTab === 'what_you_get') {
        return <p>{meta.what_you_get ?? 'Details coming soon.'}</p>
    }
    return <span className="text-white/45">Coming soon.</span>
}
