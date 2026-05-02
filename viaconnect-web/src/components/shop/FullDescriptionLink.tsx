/**
 * FullDescriptionLink renders a Lucide ArrowRight link from the catalog
 * card or preview PDP to /shop/product/<slug>/full per Prompt #144 v2 §3.2.
 *
 * Label branches on category: testing kits show "Full Panel Details",
 * supplements show "Full Description". Stops Link click propagation when
 * nested inside a card-wide <Link> wrapper so taps reach the canonical
 * full-card route rather than the preview PDP.
 *
 * Tap target meets WCAG 44px minimum via px-4 py-3 plus text-sm.
 */
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface FullDescriptionLinkProps {
    slug: string
    categorySlug: string | null
}

export function FullDescriptionLink({ slug, categorySlug }: FullDescriptionLinkProps) {
    const isTestingKit = categorySlug === 'genex360'
    const label = isTestingKit ? 'Full Panel Details' : 'Full Description'

    return (
        <Link
            href={`/shop/product/${slug}/full`}
            onClick={(e) => e.stopPropagation()}
            className="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#2DA5A0]/40 hover:bg-white/10"
            aria-label={`${label} for this product`}
        >
            <span className="text-sm font-medium text-white">{label}</span>
            <ArrowRight
                className="h-4 w-4 text-white/60 transition-colors group-hover:text-[#2DA5A0]"
                aria-hidden="true"
            />
        </Link>
    )
}
