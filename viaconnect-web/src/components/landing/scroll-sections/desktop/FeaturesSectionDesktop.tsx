'use client'
import { useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { featureCards } from '../shared/featureCards'
import { FEATURES_INTRO_COPY } from '@/lib/practitioner/waitlist-honesty'
import { FeaturesMobileAccordion } from '../mobile/FeaturesSectionMobile'

export function FeaturesSectionDesktop() {
    const [openId, setOpenId] = useState<string | null>(null)
    const reduceMotion = useReducedMotion()

    const handleToggle = (id: string) => {
        setOpenId((current) => (current === id ? null : id))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && openId) {
            setOpenId(null)
        }
    }

    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-20 px-5 md:py-32 md:px-12"
        >
            <div className="max-w-7xl mx-auto" onKeyDown={handleKeyDown}>
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

                <div className="lg:hidden">
                    <FeaturesMobileAccordion
                        openId={openId}
                        onToggle={handleToggle}
                        reduceMotion={!!reduceMotion}
                    />
                </div>

                <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {featureCards.map((card, i) => {
                        const Icon = card.icon
                        return (
                            <motion.article
                                key={card.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#2DA5A0]/40 transition-all duration-300"
                            >
                                <Icon strokeWidth={1.5} className="w-8 h-8 text-[#2DA5A0] mb-6" />
                                <h3 className="text-white text-xl font-medium leading-tight mb-3">{card.headline}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{card.body}</p>
                            </motion.article>
                        )
                    })}
                </div>
            </div>
        </SectionAnchor>
    )
}
