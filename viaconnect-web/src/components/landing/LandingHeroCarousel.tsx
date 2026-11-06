'use client'
import { useEffect, useState } from 'react'
import { InfiniteSlider } from '@/components/ui/infinite-slider'

// Locked to the first viewport. Sits at the bottom of the hero on page load
// and scrolls away naturally as the user moves into TrustBand and beyond.
// Positioned absolutely within `<main className="relative">` so it scrolls
// with the page rather than inheriting StickyHeroWrapper's pinned behavior.
//
// z-[2] keeps it above the hero video (z-0) and the gradient overlay (z-[1])
// while staying below the scroll sections (z-10) that come after the hero.
//
// Prompt #139g (Path G1): visible on mobile too with 25% size reduction
// (text, internal gap, vertical padding, InfiniteSlider chip gap). Desktop
// unchanged via min-[1000px]: prefixes + matchMedia-driven gap prop.
export function LandingHeroCarousel() {
    // Gap is a JS prop. Below 1000px the ticker is hidden; the 999px query
    // keeps the smaller mobile gap if it is ever shown. Desktop gap scales
    // with the viewport but never closes, so chips cannot sit on each other.
    const [gap, setGap] = useState(64)
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 999px)')
        const update = () => {
            if (mql.matches) {
                setGap(84)
                return
            }
            const raw = Math.round(Math.min(window.innerWidth * 0.055, window.innerHeight * 0.1))
            setGap(Math.max(32, Math.min(112, raw)))
        }
        update()
        mql.addEventListener('change', update)
        window.addEventListener('resize', update)
        return () => {
            mql.removeEventListener('change', update)
            window.removeEventListener('resize', update)
        }
    }, [])

    const chipClass = 'shrink-0 font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap'

    return (
        <section
            aria-hidden="true"
            data-testid="hero-ticker"
            className="relative z-10 hidden min-[1000px]:mt-auto min-[1000px]:flex h-[clamp(1.75rem,4.5vh,2.75rem)] w-full shrink-0 items-center overflow-hidden"
        >
            <div className="group relative pointer-events-auto w-full">
                <InfiniteSlider speedOnHover={20} speed={40} gap={gap}>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>Backed by Science</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>Encrypted in transit</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>GMP Certified</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>CAP/CLIA Lab Partners</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>Dual Liposomal-Micellar Delivery</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>Maximum Bioavailability</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>28-Peptide Product Data</span>
                    <span className={chipClass} style={{ fontSize: 'clamp(0.65rem, 1.45vh, 0.875rem)' }}>SNP-Targeted Nutraceuticals</span>
                </InfiniteSlider>
            </div>
        </section>
    )
}
