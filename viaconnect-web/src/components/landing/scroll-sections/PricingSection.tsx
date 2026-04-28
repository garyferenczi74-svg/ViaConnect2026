'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from './shared/SectionAnchor'
import { SECTION_IDS } from './shared/sectionConstants'
import { PricingTierGrid } from '@/components/pricing/PricingTierGrid'

// Pricing scroll wrapper. Single responsive component used by both the
// desktop and mobile LandingScrollSections trees (no divergence needed
// since PricingTierGrid is already responsive). Inserted between
// AboutSection and FinalCTA per #139d.
//
// Header rhythm matches the other sections (Features/Process/etc):
// teal eyebrow uppercase tracking, light-weight large H2 with period,
// muted body subtitle. ViaConnect (TM) symbol on eyebrow per spec.
//
// Section is fully transparent per #139c Phase 1 conventions, so the
// hero video shows through. Card-level backgrounds inside PricingTierGrid
// (TierCard's bg-[#1E3054]/75 backdrop-blur-md) preserved as-is per
// spec Phase 1 conservative posture.
export function PricingSection() {
    return (
        <SectionAnchor
            id={SECTION_IDS.pricing}
            ariaLabel="ViaConnect Pricing"
            className="min-h-screen py-20 px-5 md:py-32 md:px-12"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-12 md:mb-20 text-center"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs md:text-sm mb-3 md:mb-4 font-medium">
                        ViaConnect&trade; Membership
                    </p>
                    <h2 className="text-white text-4xl md:text-6xl font-light leading-tight mb-4 md:mb-6">
                        Pick the plan that fits your journey.
                    </h2>
                    <p className="text-white/70 text-base md:text-xl max-w-3xl mx-auto leading-relaxed">
                        Every tier includes the CAQ assessment and Bio Optimization Score. Upgrade to unlock dynamic tracking, GeneX360 integration, and family coordination.
                    </p>
                </motion.div>

                <PricingTierGrid />
            </div>
        </SectionAnchor>
    )
}
