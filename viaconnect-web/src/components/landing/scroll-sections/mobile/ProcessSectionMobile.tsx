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

export function ProcessSectionMobile() {
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
                        How It Works
                    </p>
                    <h2 className="text-white text-4xl font-light leading-tight mb-4">
                        From your DNA to your daily protocol
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        A guided assessment, then your personalized plan. Add genetics or labs anytime to deepen the protocol.
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
                                    {phase.sub && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {phase.sub.map((s) => (
                                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 uppercase tracking-wider">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-10">
                    <p className="text-white/80 text-sm leading-relaxed">
                        Your protocol generates as soon as the assessment completes. Bio Optimization Score, supplement protocol, interaction checks, and analytics all populate together.
                    </p>
                </div>

                <div className="space-y-4">
                    {TIER_CARDS.map((tier, i) => (
                        <motion.div
                            key={tier.tier}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            className={`rounded-xl p-6 border ${tier.accent ? 'bg-[#B75E18]/10 border-[#B75E18]/40' : 'bg-white/5 border-white/10'}`}
                        >
                            <p className="text-[#2DA5A0] text-xs uppercase tracking-wider font-medium mb-1">{tier.tier}</p>
                            <p className="text-white/50 text-xs mb-3">{tier.inputs}</p>
                            <h3 className="text-white text-lg font-medium mb-2">{tier.name}</h3>
                            <p className="text-white/70 text-sm leading-relaxed">{tier.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionAnchor>
    )
}
