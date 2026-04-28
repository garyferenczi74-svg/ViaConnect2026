'use client'
import { motion } from 'framer-motion'
import { User, Heart, Activity, Pill, Sun, Dna, FlaskConical } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'

const PHASES = [
    { icon: User, label: 'Demographics' },
    { icon: Heart, label: 'Health History' },
    { icon: Activity, label: 'Symptoms', sub: ['Physical', 'Neuro', 'Emotional'] },
    { icon: Pill, label: 'Medications and Supplements' },
    { icon: Sun, label: 'Lifestyle' },
    { icon: Dna, label: 'Genetics Upload', optional: true },
    { icon: FlaskConical, label: 'Lab Upload', optional: true },
]

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
                        How It Works
                    </p>
                    <h2 className="text-white text-6xl font-light leading-tight mb-6">
                        From your DNA to your daily protocol.
                    </h2>
                    <p className="text-white/70 text-xl max-w-3xl leading-relaxed">
                        A guided assessment, then your personalized plan. Add genetics or labs anytime to deepen the protocol.
                    </p>
                </motion.div>

                <div className="relative mb-20">
                    <div className="hidden xl:block absolute top-8 left-12 right-12 h-px bg-gradient-to-r from-transparent via-[#2DA5A0]/40 to-transparent" />
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-6">
                        {PHASES.map((phase, i) => {
                            const Icon = phase.icon
                            return (
                                <motion.div
                                    key={phase.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-[#0d1225] border border-[#2DA5A0]/40 flex items-center justify-center mb-4 z-10">
                                        <Icon strokeWidth={1.5} className="w-7 h-7 text-[#2DA5A0]" />
                                    </div>
                                    <p className="text-white text-sm font-medium leading-snug">{phase.label}</p>
                                    {phase.optional && (
                                        <span className="mt-2 text-xs text-[#B75E18] uppercase tracking-wider">Optional</span>
                                    )}
                                    {phase.sub && (
                                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                                            {phase.sub.map((s) => (
                                                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 uppercase tracking-wider">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-16"
                >
                    <p className="text-white/80 text-base leading-relaxed">
                        Your protocol generates as soon as the assessment completes. Bio Optimization Score, supplement protocol, interaction checks, and analytics all populate together.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {TIER_CARDS.map((tier, i) => (
                        <motion.div
                            key={tier.tier}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className={`rounded-2xl p-8 border ${tier.accent ? 'bg-[#B75E18]/10 border-[#B75E18]/40' : 'bg-white/5 border-white/10'}`}
                        >
                            <p className="text-[#2DA5A0] text-xs uppercase tracking-wider font-medium mb-2">{tier.tier}</p>
                            <p className="text-white/50 text-xs mb-4">{tier.inputs}</p>
                            <h3 className="text-white text-xl font-medium mb-3">{tier.name}</h3>
                            <p className="text-white/70 text-sm leading-relaxed">{tier.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionAnchor>
    )
}
