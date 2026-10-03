/**
 * FullDescriptionLink renders a link from the catalog card to
 * /shop/product/<slug>/full per Prompt #144 v2 §3.2.
 *
 * Label branches on category: testing kits show "Full Panel Details",
 * supplements show "Description". Stops Link click propagation when
 * nested inside a card-wide <Link> wrapper so taps reach the canonical
 * full-card route rather than the preview PDP.
 */
'use client'

import Link from 'next/link'
import { ChevronRight, Info } from 'lucide-react'
import { openPillClass } from './cardOpenPill'

interface FullDescriptionLinkProps {
    slug: string
    categorySlug: string | null
}

export function FullDescriptionLink({ slug, categorySlug }: FullDescriptionLinkProps) {
    const isTestingKit = categorySlug === 'genex360'
    const label = isTestingKit ? 'Full Panel Details' : 'Description'

    return (
        <Link
            href={`/shop/product/${slug}/full`}
            onClick={(e) => e.stopPropagation()}
            className={openPillClass(false)}
            aria-label={`${label} for this product`}
        >
            <Info className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.5} aria-hidden />
            <span>{label}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        </Link>
    )
}
