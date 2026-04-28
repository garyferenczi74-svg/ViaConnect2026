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
        description: 'Daily score tracking recovery, sleep, strain, and regimen adherence. Five tiers from foundational to optimized.',
    },
    {
        icon: BarChart3,
        title: 'Wellness Analytics',
        description: 'Real-time health intelligence across nutrient, symptom, risk, protocol, sleep, stress, metabolic, and immune categories.',
    },
    {
        icon: Users,
        title: 'Three-Portal Ecosystem',
        description: 'Consumer, Practitioner, and Naturopath portals on one unified data model. Role-based views protect privacy and clinical authority.',
    },
    {
        icon: Stethoscope,
        title: 'Medical and Herbal Interaction Engine',
        description: 'Multi-layer safety check across medications, supplements, and allergies. Practitioner override available.',
    },
    {
        icon: Trophy,
        title: 'Helix Rewards',
        description: 'Earn. Compete. Reward. Engagement-driven loyalty system on the consumer portal.',
    },
]

export function FeaturesSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-32 px-12 bg-[rgba(26,39,68,0.85)] backdrop-blur-xl"
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
                        Features built for your biology.
                    </h2>
                    <p className="text-white/70 text-xl max-w-3xl leading-relaxed">
                        One platform. Genomic testing, AI protocols, peptide therapeutics, real-time analytics, and a three-portal ecosystem connecting you to clinical expertise.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                    {FEATURES.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#2DA5A0]/40 transition-all duration-300"
                            >
                                <Icon strokeWidth={1.5} className="w-8 h-8 text-[#2DA5A0] mb-6" />
                                <h3 className="text-white text-xl font-medium mb-3">{feature.title}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </SectionAnchor>
    )
}
