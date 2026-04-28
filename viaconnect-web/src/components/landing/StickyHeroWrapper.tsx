'use client'
import { ReactNode } from 'react'

interface StickyHeroWrapperProps {
    children: ReactNode
}

// Prompt #139f: viewport-class branching to fix unreachable mobile hero CTAs.
//
// Desktop (lg+): existing #139c sticky-from-top behavior preserved verbatim.
// Hero is sticky for the entire scroll narrative; gradient overlay layers
// readability floor for the scroll-over sections.
//
// Mobile (<lg): two-phase engagement zone + sticky backdrop.
//  Phase 1: hero in normal flow at h-[100dvh]. CTAs are tappable for the full
//    100dvh of scroll. Hero video plays here only.
//  Phase 2: static backdrop with -mt-[100dvh] visual overlap. -z-10 keeps it
//    BEHIND Phase 1 during 0-100dvh scroll. Once Phase 1 has scrolled off,
//    Phase 2's static backdrop (#0D1225 + gradient overlay matching #139c)
//    provides the readability floor for Features/Process/Genomics/About/
//    Pricing/FinalCTA scroll-over sections.
//  Hero video does NOT re-render in Phase 2 (acceptable degradation per
//  spec §3.2 Option Mii); the scroll narrative reads against a static
//  brand-coherent dark navy backdrop on mobile.
export function StickyHeroWrapper({ children }: StickyHeroWrapperProps) {
    return (
        <>
            <div className="hidden lg:block sticky top-0 left-0 w-full h-screen z-0 overflow-hidden">
                {children}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none z-[1] bg-gradient-to-b from-black/20 via-black/30 to-black/40"
                />
            </div>

            <div className="block lg:hidden">
                <div className="relative w-full h-[100dvh] z-0 overflow-hidden">
                    {children}
                </div>
                <div
                    aria-hidden="true"
                    className="sticky top-0 w-full h-[100dvh] -z-10 overflow-hidden -mt-[100dvh] pointer-events-none"
                >
                    <div className="absolute inset-0 bg-[#0D1225]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/40" />
                </div>
            </div>
        </>
    )
}
