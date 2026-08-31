'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { coverflowFeatureCards } from '../shared/featureCards'
import { FEATURES_INTRO_COPY } from '@/lib/practitioner/waitlist-honesty'
import { CoverFlowCarousel } from '@/components/ui/3-d-coverflow-carousel'

export function FeaturesSectionMobile() {
    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-20 px-5"
        >
            <div className="max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                        What You Get
                    </p>
                    <h2 className="text-white text-4xl font-light leading-tight mb-4">
                        Features built for your biology
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        {FEATURES_INTRO_COPY.mobile}
                    </p>
                </motion.div>

                <CoverFlowCarousel
                    items={coverflowFeatureCards.map((feature) => ({
                        id: feature.id,
                        title: feature.headline,
                        description: feature.body,
                        imageSrc: feature.placeholderImageSrc ?? '',
                        imageAlt: `PLACEHOLDER — ${feature.headline}. Swap this image.`,
                    }))}
                />
            </div>
        </SectionAnchor>
    )
}
