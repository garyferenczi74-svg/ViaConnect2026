/**
 * ProductCard is the variant-aware shell that wraps both supplement and
 * testing cards per Prompt #141 v3 §4.1. It owns the outer Link, image
 * container with aspect-ratio + glass treatment + hover scale, status pill
 * placement, and routes the body to either Variant A or Variant B based on
 * the `variant` prop.
 *
 * Status pill behavior (spec §4.2 / §4.3 / §10):
 *   - Pills come from products.status_tags (NEW, BUNDLE, TIER 3, etc.).
 *   - The GENE MATCH pill is conditional on the caller-confirmed match
 *     (CAQ on file AND product.gene_match_score >= 0.75) and is injected
 *     by the parent PLP via the geneMatchActive prop. The pill is not
 *     rendered from status_tags alone.
 *   - At most two pills render to keep the chrome clean.
 *
 * Image fallback (spec §4.4): when image_urls is empty, the
 * CategoryFallbackImage component renders a category-derived gradient with
 * a Lucide glyph. Console warning for missing imagery is emitted at the
 * data layer in lib/shop/queries.ts so the team can prioritize photography.
 *
 * Quick Add hover overlay (spec §4.5) is deferred to Phase C2 because it
 * requires cart context (Phase F).
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CategoryFallbackImage } from './CategoryFallbackImage'
import { ProductCardSupplementBody } from './ProductCard.SupplementBody'
import { ProductCardTestingBody } from './ProductCard.TestingBody'
import { StatusPill } from './StatusPill'
import type { ShopCardVariant } from '@/lib/shop/categories'
import type { ShopProduct } from '@/lib/shop/queries'

// Generic blur placeholder per spec §4.1. Uses a 4x5 SVG of the brand Deep
// Navy #1A2744 so every product image fades in from the brand surface
// without requiring a per-image thumbhash. Replace with column-driven
// blurDataURL when the photo backfill prompt ships.
const SHOP_CARD_BLUR_DATA_URL =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0IDUiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiMxQTI3NDQiLz48L3N2Zz4='

// Per Prompt #149 §4. Source PNGs for the Testing and Diagnostics panels
// are 3000x4000 with bleed white space around the kit boxes; the parent
// frame already carries overflow-hidden so a CSS scale on the <Image>
// over-zooms past the bleed and lets the subject fill the frame. Keyed
// by product.slug; absent slugs render at native scale (no-op).
const PLP_IMAGE_OVERZOOM: Record<string, string> = {
    'genex360': 'scale-[1.05]',
    'cannabisiq': 'scale-[1.30]',
    'epigendx': 'scale-[1.30]',
    'genexm': 'scale-[1.30]',
    'hormoneiq': 'scale-[1.30]',
    'nutrigendx': 'scale-[1.30]',
    'peptidesiq': 'scale-[1.30]',
    '30-day-custom-methylation-based-vitamin-formulations': 'scale-[1.30]',
}

interface ProductCardProps {
    product: ShopProduct
    variant: ShopCardVariant
    href: string
    geneMatchActive?: boolean
    isFormulationOpen: boolean
    onToggleFormulation: () => void
}

export function ProductCard({
    product,
    variant,
    href,
    geneMatchActive,
    isFormulationOpen,
    onToggleFormulation,
}: ProductCardProps) {
    const primaryImage = (product.image_urls && product.image_urls[0]) || product.image_url || null
    const tags = product.status_tags ?? []
    const visibleTags = [
        ...(geneMatchActive ? ['GENE MATCH'] : []),
        ...tags.filter((t) => t !== 'GENE MATCH'),
    ].slice(0, 2)
    const overzoomClass = (product.slug && PLP_IMAGE_OVERZOOM[product.slug]) || ''

    return (
        <Link
            href={href}
            className="group flex flex-col gap-3 h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1A2E]"
        >
            <div
                className="
                    relative overflow-hidden block w-full rounded-xl bg-white/[0.04] shadow-md
                    aspect-[3/4] md:aspect-[4/5]
                    transition-[transform,box-shadow] duration-300 ease-in-out
                    group-hover:scale-[1.02] group-hover:shadow-[0_12px_32px_rgba(45,165,160,0.22)]
                    before:content-[''] before:absolute before:inset-0 before:rounded-xl before:pointer-events-none
                    before:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]
                "
            >
                {primaryImage ? (
                    <Image
                        src={primaryImage}
                        alt={product.name}
                        fill
                        className={`object-cover object-top transform-gpu ${overzoomClass}`.trim()}
                        sizes="(min-width: 1280px) 296px, (min-width: 768px) 33vw, 50vw"
                        placeholder="blur"
                        blurDataURL={SHOP_CARD_BLUR_DATA_URL}
                    />
                ) : (
                    <CategoryFallbackImage categorySlug={product.category_slug} />
                )}
                {visibleTags.length > 0 && (
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                        {visibleTags.map((tag) => (
                            <StatusPill key={tag} kind={tag} />
                        ))}
                    </div>
                )}
            </div>
            {variant === 'testing' ? (
                <ProductCardTestingBody
                    product={product}
                    isFormulationOpen={isFormulationOpen}
                    onToggleFormulation={onToggleFormulation}
                />
            ) : (
                <ProductCardSupplementBody
                    product={product}
                    isFormulationOpen={isFormulationOpen}
                    onToggleFormulation={onToggleFormulation}
                />
            )}
        </Link>
    )
}
