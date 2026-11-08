'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { coverflowFeatureCards } from '../shared/featureCards'
import { FEATURES_INTRO_COPY } from '@/lib/practitioner/waitlist-honesty'
import { CoverFlowCarousel } from '@/components/ui/3-d-coverflow-carousel'
import { FeaturesFoldStyle } from '../shared/featuresFoldStyle'

export function FeaturesSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="px-5 pt-20 pb-6 md:px-12 md:pt-32 md:pb-8 min-[1000px]:!bg-[#0d1225]"
        >
            <FeaturesFoldStyle />
            <div className="features-fold max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="features-intro relative z-10 mb-[clamp(32px,4vw,64px)]"
                >
                    <p className="features-eyebrow text-[#2DA5A0] uppercase tracking-[0.2em] text-xs md:text-sm mb-3 md:mb-4 font-medium">
                        What You Get
                    </p>
                    <h2
                        data-testid="features-heading"
                        className="features-heading scroll-mt-[calc(var(--landing-nav-h,4.75rem)+1rem)] text-white text-4xl md:text-6xl font-light leading-tight mb-4 md:mb-6"
                    >
                        Features built for your biology
                    </h2>
                    <p className="features-subtitle text-white/70 text-base md:text-xl max-w-3xl leading-relaxed lg:hidden">
                        {FEATURES_INTRO_COPY.mobile}
                    </p>
                    <p className="features-subtitle text-white/70 text-base md:text-xl max-w-3xl leading-relaxed hidden lg:block">
                        {FEATURES_INTRO_COPY.desktop}
                    </p>
                </motion.div>

                {/* Below 1000px the plate is centered in a taller stage.
                    Cancel that top inset (34 / 40 / 50px) so the margin above
                    is the visible gap. From 1000px the stage matches the plate
                    and featuresFoldStyle drops this offset. */}
                <CoverFlowCarousel
                    className="-mt-[34px] sm:-mt-[40px] md:-mt-[50px]"
                    items={coverflowFeatureCards.map((card) => ({
                        id: card.id,
                        title: card.headline,
                        description: card.body,
                        imageSrc: card.placeholderImageSrc ?? '',
                        imageAlt: card.headline,
                    }))}
                />
            </div>
        </SectionAnchor>
    )
}
