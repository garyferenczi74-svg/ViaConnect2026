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
// unchanged via lg: prefixes + matchMedia-driven gap prop.
export function LandingHeroCarousel() {
    // InfiniteSlider's `gap` is a JS prop, not a className, so the responsive
    // breakpoint is detected via matchMedia. Mobile gap matches the 25%
    // reduction (112 * 0.75 = 84). SSR-safe default to desktop value.
    const [gap, setGap] = useState(112)
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 1023px)')
        const update = () => setGap(mql.matches ? 84 : 112)
        update()
        mql.addEventListener('change', update)
        return () => mql.removeEventListener('change', update)
    }, [])

    return (
        <section
            aria-hidden="true"
            className="hidden lg:block absolute left-0 right-0 z-[2] pb-2 pointer-events-none top-[calc(100svh-100px)]"
        >
            <div className="group relative pointer-events-auto">
                <div className="flex flex-col items-center md:flex-row">
                    <div className="relative py-[18px] lg:py-6 w-full">
                        <InfiniteSlider speedOnHover={20} speed={40} gap={gap}>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Backed by Science</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">HIPAA-aware</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">GMP Certified</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">CAP/CLIA Lab Partners</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Dual Liposomal-Micellar Delivery</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">10-28X Bioavailability</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">28-Peptide Product Data</span>
                            </div>
                            <div className="flex items-center gap-[6px] lg:gap-2 text-slate-400">
                                <span className="text-xs lg:text-sm font-semibold tracking-wider uppercase whitespace-nowrap">SNP-Targeted Nutraceuticals</span>
                            </div>
                        </InfiniteSlider>
                    </div>
                </div>
            </div>
        </section>
    )
}
