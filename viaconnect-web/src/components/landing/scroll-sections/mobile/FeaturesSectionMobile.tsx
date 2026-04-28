'use client'
import { motion } from 'framer-motion'
import { Dna, Pill, FlaskConical, Activity, Users, Trophy, BarChart3, Stethoscope } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'

const FEATURES = [
    {
        icon: Dna,
        title: 'Precision Genomic Testing',
        description: 'Comprehensive panel suite across six clinical pillars. Built for actionable insights, not raw data dumps.',
    },
    {
        icon: Pill,
        title: 'AI-Driven Supplement Protocols',
        description: 'Personalized formulations matched to your biology. Bioavailability optimized per delivery method.',
    },
    {
        icon: FlaskConical,
        title: 'Peptide Protocols',
        description: 'Clinician-developed peptide protocols across multiple delivery forms, matched to your variant profile.',
    },
    {
        icon: Activity,
        title: 'Bio Optimization Score',
        description: 'Daily score tracking recovery, sleep, strain, and regimen adherence.',
    },
    {
        icon: BarChart3,
        title: 'Wellness Analytics',
        description: 'Real-time health intelligence across nutrient, symptom, risk, and protocol categories.',
    },
    {
        icon: Users,
        title: 'Three-Portal Ecosystem',
        description: 'Consumer, Practitioner, and Naturopath portals on one unified data model.',
    },
    {
        icon: Stethoscope,
        title: 'Medical and Herbal Interaction Engine',
        description: 'Multi-layer safety check across medications, supplements, and allergies.',
    },
    {
        icon: Trophy,
        title: 'Helix Rewards',
        description: 'Earn. Compete. Reward. Engagement-driven loyalty system on the consumer portal.',
    },
]

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
                        One platform. Genomic testing, AI protocols, peptide therapeutics, and a three-portal ecosystem.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-4">
                    {FEATURES.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.4, delay: i * 0.04 }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 active:bg-white/10 transition-colors"
                            >
                                <Icon strokeWidth={1.5} className="w-7 h-7 text-[#2DA5A0] mb-4" />
                                <h3 className="text-white text-lg font-medium mb-2">{feature.title}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </SectionAnchor>
    )
}
