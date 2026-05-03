/**
 * PdpRightRail is the interactive right column of the product detail page,
 * restructured per Prompt #148 §A through §I 2026-05-02.
 *
 * Major changes from #144 v2:
 *   - Full Description: was FullDescriptionLink button-with-arrow routing
 *     to /shop/product/<slug>/full; now rendered inline as a permanently
 *     visible section.
 *   - Formulation: was FormulationDropdown single-open accordion; now
 *     rendered inline as PdpFormulationTable (2-column ingredient table)
 *     for supplement variant. Testing variant renders the 3 testing_meta
 *     sections inline (What's Tested + Who It's For + What You Get).
 *   - Evidence + FAQ: were CardTabStrip plain text tabs with underline
 *     active state; now TabPills matching the BreadcrumbPills visual
 *     family from Prompt #147 with shared pill-styles module.
 *
 * Purchase flow elements (price + bioavailability + summary + quantity
 * stepper + Add to Cart + Add to Bundle) untouched per #148 §Scope OUT.
 *
 * SectionHeading helper anchors each major section with a Lucide icon
 * accent in brand teal. AnimatePresence cross-fades the tab panel content
 * on tab switch (mode="wait", 0.2s easeOut).
 */
'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
    BookOpen,
    Bookmark,
    FileText,
    FlaskConical,
    HelpCircle,
    Info,
    Microscope,
    Minus,
    Plus,
    ShoppingBag,
    Users,
} from 'lucide-react'
import { FormatIndicator } from './FormatIndicator'
import { PdpFormulationTable } from './PdpFormulationTable'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TabPills } from '@/components/ui/TabPills'
import { addToCart } from '@/lib/shop/cart-store'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ShopProduct } from '@/lib/shop/queries'

const SUPPLEMENT_TAB_OPTIONS = [
    { value: 'evidence', label: 'Evidence', icon: BookOpen },
    { value: 'faq', label: 'FAQ', icon: HelpCircle },
]

const TESTING_TAB_OPTIONS = [
    { value: 'sample_report', label: 'Sample Report', icon: FileText },
    { value: 'faq', label: 'FAQ', icon: HelpCircle },
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
    const tabOptions = variant === 'testing' ? TESTING_TAB_OPTIONS : SUPPLEMENT_TAB_OPTIONS
    const [activeTab, setActiveTab] = useState<string>(tabOptions[0].value)
    const [quantity, setQuantity] = useState<number>(1)
    const reducedMotion = useReducedMotion()

    const displayPrice = product.price_msrp ?? product.price
    const ctaCopy =
        variant === 'testing' && product.requires_practitioner_order
            ? 'Order Test Kit'
            : 'Add to Cart'
    const snpTargets = product.snp_targets ?? []
    const summary = product.summary ?? ''
    const description = product.description ?? ''
    const ingredients = product.ingredients ?? []
    const meta = product.testing_meta ?? {}

    const panelTransition = reducedMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
              initial: { opacity: 0, y: 4 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -4 },
              transition: { duration: 0.2, ease: 'easeOut' as const },
          }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-balance text-3xl font-bold text-white leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
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

            <section className="mt-2 border-t border-white/10 pt-8">
                <SectionHeading icon={FileText}>Full Description</SectionHeading>
                {description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-white/80 md:text-base">
                        {description}
                    </p>
                ) : (
                    <p className="text-sm text-white/45">Description coming soon.</p>
                )}
            </section>

            {variant === 'supplement' ? (
                <section className="mt-2 border-t border-white/10 pt-8">
                    <SectionHeading icon={FlaskConical}>Formulation</SectionHeading>
                    <PdpFormulationTable ingredients={ingredients} />
                </section>
            ) : (
                <section className="mt-2 border-t border-white/10 pt-8">
                    <SectionHeading icon={Microscope}>What's Tested</SectionHeading>
                    {meta.what_is_tested ? (
                        <p className="text-sm leading-relaxed text-white/80 md:text-base">
                            {meta.what_is_tested}
                        </p>
                    ) : (
                        <p className="text-sm text-white/45">Details coming soon.</p>
                    )}
                    <div className="mt-6">
                        <SectionHeading icon={Users}>Who It's For</SectionHeading>
                        {meta.who_its_for ? (
                            <p className="text-sm leading-relaxed text-white/80 md:text-base">
                                {meta.who_its_for}
                            </p>
                        ) : (
                            <p className="text-sm text-white/45">Details coming soon.</p>
                        )}
                    </div>
                    <div className="mt-6">
                        <SectionHeading icon={Info}>What You Get</SectionHeading>
                        {meta.what_you_get ? (
                            <p className="text-sm leading-relaxed text-white/80 md:text-base">
                                {meta.what_you_get}
                            </p>
                        ) : (
                            <p className="text-sm text-white/45">Details coming soon.</p>
                        )}
                    </div>
                </section>
            )}

            <section className="mt-2 border-t border-white/10 pt-8">
                <TabPills
                    options={tabOptions}
                    value={activeTab}
                    onChange={setActiveTab}
                    ariaLabel="Product information tabs"
                />
                <div
                    role="tabpanel"
                    aria-labelledby={activeTab}
                    className="mt-4 min-h-[6rem] text-sm leading-relaxed text-white/70"
                >
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} {...panelTransition}>
                            <PdpTabContent variant={variant} activeTab={activeTab} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

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
            return <span className="text-white/45">Frequently asked questions coming soon.</span>
        }
        return <span className="text-white/45">Coming soon.</span>
    }
    if (activeTab === 'sample_report') {
        return <span className="text-white/45">Sample report viewer coming soon.</span>
    }
    if (activeTab === 'faq') {
        return <span className="text-white/45">Frequently asked questions coming soon.</span>
    }
    return <span className="text-white/45">Coming soon.</span>
}
