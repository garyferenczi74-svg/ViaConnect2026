'use client'
import { motion } from 'framer-motion'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { ProcessFoldStyle } from '../shared/processFoldStyle'
import { ProcessAssessmentSteps } from '../shared/ProcessAssessmentSteps'

const TIER_CARDS = [
    {
        tier: 'Tier 1',
        inputs: 'CAQ only',
        name: 'Baseline protocol',
        description: 'Broad-spectrum nutritional support shaped by your intake questionnaire. Addresses commonly under-met nutrient categories and lifestyle-driven gaps.',
    },
    {
        tier: 'Tier 2',
        inputs: 'CAQ plus labs',
        name: 'Biomarker-guided protocol',
        description: 'Refines the baseline using your reported lab values. Targets nutrient categories where measured biomarkers indicate meaningful depletion or imbalance.',
    },
    {
        tier: 'Tier 3',
        inputs: 'CAQ plus labs plus genetics',
        name: 'Genomically integrated protocol',
        description: 'Layers validated gene-to-nutrient pathways onto questionnaire and biomarker context. Adjusts for variants influencing absorption, conversion, and cofactor demand.',
        accent: true,
    },
]

export function ProcessSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.process}
            ariaLabel="ViaConnect Process"
            className="px-5 pt-8 pb-20 md:px-12 md:pt-10 md:pb-32"
        >
            <ProcessFoldStyle />
            <div className="max-w-7xl mx-auto">
                <motion.div
                    data-testid="process-intro"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="process-intro mb-12 md:mb-20"
                >
                    <p className="process-eyebrow text-[#2DA5A0] uppercase tracking-[0.2em] text-xs md:text-sm mb-3 md:mb-4 font-medium">
                        Onboarding Questionnaire
                    </p>
                    <h2
                        data-testid="process-heading"
                        className="process-heading scroll-mt-[calc(var(--landing-nav-h,4.75rem)+1rem)] text-white text-4xl md:text-6xl font-light leading-tight mb-4 md:mb-6"
                    >
                        From your DNA to your daily protocol
                    </h2>
                    <p
                        data-testid="process-subtitle"
                        className="process-subtitle text-white/70 text-base md:text-xl max-w-3xl leading-relaxed"
                    >
                        A guided assessment, then your personalized plan. Add genetics or labs anytime to deepen the protocol.
                    </p>
                </motion.div>

                <div className="process-steps relative mb-12 md:mb-20">
                    <ProcessAssessmentSteps />
                </div>

                <motion.div
                    data-testid="process-note"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="process-note bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-10 md:mb-16"
                >
                    <p className="text-white/80 text-base leading-relaxed">
                        Your protocol generates as soon as the assessment completes. Bio Optimization Score, supplement protocol, interaction checks, and analytics all populate together.
                    </p>
                </motion.div>

                <div data-testid="process-tiers" className="process-tiers grid grid-cols-1 md:grid-cols-3 gap-6">
                    {TIER_CARDS.map((tier, i) => (
                        <motion.div
                            key={tier.tier}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className={`process-tier rounded-2xl p-8 border ${tier.accent ? 'bg-[#B75E18]/10 border-[#B75E18]/40' : 'bg-white/5 border-white/10'}`}
                        >
                            <p className="process-tier-kicker text-[#2DA5A0] text-xs uppercase tracking-wider font-medium mb-2">{tier.tier}</p>
                            <p className="process-tier-inputs text-white/50 text-xs mb-4">{tier.inputs}</p>
                            <h3 className="process-tier-name text-white text-xl font-medium mb-3">{tier.name}</h3>
                            <p className="process-tier-body text-white/70 text-sm leading-relaxed">{tier.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionAnchor>
    )
}
