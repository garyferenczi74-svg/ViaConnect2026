/**
 * PdpRightRail is the interactive right column of the product detail page
 * per Prompt #141 v3 §5.3, restructured per Prompt #144 v2 §3.6.
 *
 * Description and Formulation tabs are replaced with FullDescriptionLink
 * (routes to /shop/product/<slug>/full) and FormulationDropdown (inline
 * single-open accordion showing the FULL ingredient list). The short
 * blurb above stays in place when the dropdown expands. Evidence and FAQ
 * tabs remain as stub tab strip for future evidence + faq content.
 *
 * Testing variant follows the same pattern: TestingMetaDropdown replaces
 * the What's Tested / Who It's For / What You Get tabs; Sample Report
 * and FAQ tabs remain as stubs.
 *
 * Cart and bundle wiring lands in Phase F. Genetic match section renders
 * inline when product.snp_targets has any entries; full per-user CAQ
 * check lives in a later phase.
 */
'use client'

import { useState } from 'react'
import { Bookmark, Minus, Plus, ShoppingBag } from 'lucide-react'
import { CardTabStrip } from './CardTabStrip'
import { FormatIndicator } from './FormatIndicator'
import { FormulationDropdown } from './FormulationDropdown'
import { FullDescriptionLink } from './FullDescriptionLink'
import { TestingMetaDropdown } from './TestingMetaDropdown'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ShopProduct } from '@/lib/shop/queries'

const SUPPLEMENT_TABS = [
    { key: 'evidence', label: 'Evidence' },
    { key: 'faq', label: 'FAQ' },
]

const TESTING_TABS = [
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
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)

    const displayPrice = product.price_msrp ?? product.price
    const ctaCopy =
        variant === 'testing' && product.requires_practitioner_order ? 'Order Test Kit' : 'Add to Cart'
    const snpTargets = product.snp_targets ?? []
    const summary = product.summary ?? ''
    const slug = product.slug ?? product.sku

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

            {summary && (
                <p className="text-sm leading-relaxed text-white/75 md:text-base">{summary}</p>
            )}

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
                    {ctaCopy}
                </button>
                {variant === 'supplement' && (
                    <button
                        type="button"
                        onClick={() => console.info('[shop] PDP Add to Bundle (stub)', { sku: product.sku })}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3 font-medium text-white transition-colors hover:bg-white/[0.08]"
                    >
                        <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                        Add to Bundle
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <FullDescriptionLink slug={slug} categorySlug={product.category_slug} />
                {variant === 'testing' ? (
                    <TestingMetaDropdown
                        testingMeta={product.testing_meta}
                        isOpen={dropdownOpen}
                        onToggle={() => setDropdownOpen((open) => !open)}
                    />
                ) : (
                    <FormulationDropdown
                        ingredients={product.ingredients}
                        totalMgPerServing={null}
                        isOpen={dropdownOpen}
                        onToggle={() => setDropdownOpen((open) => !open)}
                    />
                )}
            </div>

            <div className="border-t border-white/[0.06] pt-6">
                <CardTabStrip
                    tabs={tabs}
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="overflow-x-auto"
                />
                <div className="mt-4 min-h-[6rem] text-sm leading-relaxed text-white/70">
                    <PdpTabContent variant={variant} activeTab={activeTab} />
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
    variant,
    activeTab,
}: {
    variant: ShopCardVariant
    activeTab: string
}) {
    if (variant === 'supplement') {
        if (activeTab === 'evidence') {
            return <span className="text-white/45">Clinical evidence coming soon.</span>
        }
        if (activeTab === 'faq') {
            return <span className="text-white/45">FAQ coming soon.</span>
        }
        return <span className="text-white/45">Coming soon.</span>
    }
    if (activeTab === 'sample_report') {
        return <span className="text-white/45">Sample report viewer coming soon.</span>
    }
    if (activeTab === 'faq') {
        return <span className="text-white/45">FAQ coming soon.</span>
    }
    return <span className="text-white/45">Coming soon.</span>
}
