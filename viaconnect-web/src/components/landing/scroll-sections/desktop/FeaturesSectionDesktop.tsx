'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { featureCards } from '../shared/featureCards'

export function FeaturesSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-32 px-12"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-20"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-sm mb-4 font-medium">
                        What You Get
                    </p>
                    <h2 className="text-white text-6xl font-light leading-tight mb-6">
                        Features built for your biology
                    </h2>
                    <p className="text-white/70 text-xl max-w-3xl leading-relaxed">
                        One platform. Genomic testing, AI protocols, peptide therapeutics, real-time analytics, and a three-portal ecosystem connecting you to clinical expertise.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
