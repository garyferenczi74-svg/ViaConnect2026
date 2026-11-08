'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { PillarCard } from '@/components/landing/HeroPillars'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { ProcessFoldStyle } from '../shared/processFoldStyle'
import { ProcessAssessmentSteps } from '../shared/ProcessAssessmentSteps'
import { PROCESS_TIER_CARDS } from '../shared/processTierCards'

export function ProcessSectionDesktop() {
    const reduceMotion = useReducedMotion() ?? false
    return (
        <SectionAnchor
            id={SECTION_IDS.process}
            ariaLabel="ViaConnect Process"
            className="px-5 pt-8 pb-20 md:px-12 md:pt-10 md:pb-32"
        >
            <ProcessFoldStyle />
            <div className="process-stack mx-auto max-w-7xl">
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
                        A guided assessment, then your personalized plan Add genetics or labs anytime to deepen the protocol
                    </p>
                </motion.div>

                <div className="process-gap hidden min-[1000px]:block" aria-hidden="true" />

                <div className="process-steps relative mb-12 md:mb-20">
                    <ProcessAssessmentSteps />
                </div>

                <div className="process-gap hidden min-[1000px]:block" aria-hidden="true" />

                <motion.div
                    data-testid="process-note"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="process-note mb-10 md:mb-16"
                >
                    <p className="process-note-copy text-left text-white/80 text-sm leading-relaxed min-[1000px]:whitespace-nowrap">
                        Your protocol generates as soon as the assessment completes Bio Optimization Score, supplement protocol, interaction checks, and analytics all populate together
                    </p>
                </motion.div>

                <div className="process-gap hidden min-[1000px]:block" aria-hidden="true" />

                <div data-testid="process-tiers" role="list" className="process-tiers grid grid-cols-1 gap-4 md:grid-cols-3">
                    {PROCESS_TIER_CARDS.map((tier, index) => (
                        <div key={tier.numeral} className="process-tier h-full">
                            <PillarCard pillar={tier} index={index} reduceMotion={reduceMotion} />
                        </div>
                    ))}
                </div>
            </div>
        </SectionAnchor>
    )
}
