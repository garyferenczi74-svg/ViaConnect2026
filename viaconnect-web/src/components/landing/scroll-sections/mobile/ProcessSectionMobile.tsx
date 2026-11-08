'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { User, Heart, Activity, Pill, Sun, Dna, FlaskConical } from 'lucide-react'
import { PillarCard } from '@/components/landing/HeroPillars'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { PROCESS_TIER_CARDS } from '../shared/processTierCards'

const PHASES = [
    { icon: User, label: 'Demographics' },
    { icon: Heart, label: 'Health History' },
    { icon: Activity, label: 'Symptoms' },
    { icon: Pill, label: 'Medications and Supplements' },
    { icon: Sun, label: 'Lifestyle' },
    { icon: Dna, label: 'Genetics Upload', optional: true },
    { icon: FlaskConical, label: 'Lab Upload', optional: true },
]

export function ProcessSectionMobile() {
    const reduceMotion = useReducedMotion() ?? false
    return (
        <SectionAnchor
            id={SECTION_IDS.process}
            ariaLabel="ViaConnect Process"
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
                        Onboarding Questionnaire
                    </p>
                    <h2 className="text-white text-4xl font-light leading-tight mb-4">
                        From your DNA to your daily protocol
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        A guided assessment, then your personalized plan Add genetics or labs anytime to deepen the protocol
                    </p>
                </motion.div>

                <div className="space-y-3 mb-12">
                    {PHASES.map((phase, i) => {
                        const Icon = phase.icon
                        return (
                            <motion.div
                                key={phase.label}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#0d1225] border border-[#2DA5A0]/40 flex items-center justify-center flex-shrink-0">
                                    <Icon strokeWidth={1.5} className="w-5 h-5 text-[#2DA5A0]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{phase.label}</p>
                                    {phase.optional && (
                                        <span className="text-[10px] text-[#B75E18] uppercase tracking-wider">Optional</span>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <div className="mb-10">
                    <p className="text-left text-white/80 text-sm leading-relaxed">
                        Your protocol generates as soon as the assessment completes Bio Optimization Score, supplement protocol, interaction checks, and analytics all populate together
                    </p>
                </div>

                <div className="process-tiers grid grid-cols-1 gap-4" role="list">
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
