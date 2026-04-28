'use client'
import { InfiniteSlider } from '@/components/ui/infinite-slider'

// Locked to the first viewport. Sits at the bottom of the hero on page load
// and scrolls away naturally as the user moves into TrustBand and beyond.
// Positioned absolutely within `<main className="relative">` so it scrolls
// with the page rather than inheriting StickyHeroWrapper's pinned behavior.
//
// z-[2] keeps it above the hero video (z-0) and the gradient overlay (z-[1])
// while staying below the scroll sections (z-10) that come after the hero.
export function LandingHeroCarousel() {
    return (
        <section
            aria-hidden="true"
            className="hidden lg:block absolute left-0 right-0 z-[2] pb-2 pointer-events-none top-[calc(100svh-100px)]"
        >
            <div className="group relative pointer-events-auto">
                <div className="flex flex-col items-center md:flex-row">
                    <div className="relative py-6 w-full">
                        <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Backed by Science</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">HIPAA-aware</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">GMP Certified</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">CAP/CLIA Lab Partners</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Dual Liposomal-Micellar Delivery</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">10-28X Bioavailability</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">28-Peptide Product Data</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">SNP-Targeted Nutraceuticals</span>
                            </div>
                        </InfiniteSlider>
                    </div>
                </div>
            </div>
        </section>
    )
}
