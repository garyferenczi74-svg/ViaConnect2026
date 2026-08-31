'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { coverflowFeatureCards } from '../shared/featureCards'
import { FEATURES_INTRO_COPY } from '@/lib/practitioner/waitlist-honesty'
import { CoverFlowCarousel } from '@/components/ui/3-d-coverflow-carousel'

export function FeaturesSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-20 px-5 md:py-32 md:px-12"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-12 md:mb-20"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs md:text-sm mb-3 md:mb-4 font-medium">
                        What You Get
                    </p>
                    <h2 className="text-white text-4xl md:text-6xl font-light leading-tight mb-4 md:mb-6">
                        Features built for your biology
                    </h2>
                    <p className="text-white/70 text-base md:text-xl max-w-3xl leading-relaxed lg:hidden">
                        {FEATURES_INTRO_COPY.mobile}
                    </p>
                    <p className="text-white/70 text-base md:text-xl max-w-3xl leading-relaxed hidden lg:block">
                        {FEATURES_INTRO_COPY.desktop}
                    </p>
                </motion.div>

                <CoverFlowCarousel
                    items={coverflowFeatureCards.map((card) => ({
                        id: card.id,
                        title: card.headline,
                        description: card.body,
                        imageSrc: card.placeholderImageSrc ?? '',
                        imageAlt: `PLACEHOLDER — ${card.headline}. Swap this image.`,
                    }))}
                />
            </div>
        </SectionAnchor>
    )
}
