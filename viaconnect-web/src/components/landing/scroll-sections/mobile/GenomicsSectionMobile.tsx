'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Dna, Apple, Activity, Layers, FlaskConical, Leaf, ArrowRight } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS, TAGLINES } from '../shared/sectionConstants'

const PANELS = [
    { icon: Dna, name: 'GeneX-M', accent: '#2DA5A0', description: 'Methylation, detoxification, and core metabolic pathways. The foundational panel.' },
    { icon: Apple, name: 'NutrigenDX', accent: '#7BA85B', description: 'Nutrient absorption, metabolism, and dietary response.' },
    { icon: Activity, name: 'HormoneIQ', accent: '#B75E18', description: 'Estrogen, testosterone, thyroid, and cortisol pathways.' },
    { icon: Layers, name: 'EpigenHQ', accent: '#8B5CF6', description: 'Methylation patterns and epigenetic markers.' },
    { icon: FlaskConical, name: 'PeptideIQ', accent: '#06B6D4', description: 'Peptide receptor sensitivity across metabolic, recovery, and longevity peptide families.' },
    { icon: Leaf, name: 'CannabisIQ', accent: '#22C55E', description: 'CB1 and CB2 receptor variants, endocannabinoid metabolism.' },
]

const SAMPLE_VARIANTS = [
    {
        gene: 'MTHFR',
        variant: 'C677T',
        implication: 'People with this variant may process folate via alternative pathways, which can shift how the body uses certain B vitamins.',
        state: 'teal' as const,
    },
    {
        gene: 'COMT',
        variant: 'V158M',
        implication: 'Carriers metabolize catecholamines at differing rates, which may influence how the body responds to stress signaling.',
        state: 'grey' as const,
    },
    {
        gene: 'VDR',
        variant: 'FokI',
        implication: 'This variant is associated with differences in how cells respond to vitamin D, which can affect baseline calcium and bone signaling.',
        state: 'orange' as const,
    },
]

const STATE_STYLES: Record<'teal' | 'grey' | 'orange', string> = {
    teal: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/5',
    grey: 'border-white/10 bg-white/5',
    orange: 'border-[#B75E18]/40 bg-[#B75E18]/5',
}

const STATE_LABEL: Record<'teal' | 'grey' | 'orange', string> = {
    teal: 'Your variant',
    grey: 'Unanalyzed',
    orange: 'Reference',
}

export function GenomicsSectionMobile() {
    return (
        <SectionAnchor
            id={SECTION_IDS.genomics}
            ariaLabel="ViaConnect Genomics"
            className="min-h-screen py-20 px-5 bg-[rgba(13,18,37,0.9)] backdrop-blur-xl"
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
                        The Science
                    </p>
                    <h2 className="text-white text-4xl font-light leading-tight mb-2">
                        {TAGLINES.master}.
                    </h2>
                    <p className="text-[#2DA5A0] text-lg font-light tracking-wide mb-4">
                        {TAGLINES.snpSubLine}
                    </p>
                    <p className="text-white/70 text-base leading-relaxed">
                        GeneX360 reads variants across six clinical panels. Your genetics drive your protocol. Not generic averages. Not population means. You.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-4 mb-12">
                    {PANELS.map((panel, i) => {
                        const Icon = panel.icon
                        return (
                            <motion.div
                                key={panel.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
                                style={{ borderTopColor: panel.accent, borderTopWidth: '2px' }}
                            >
                                <Icon strokeWidth={1.5} className="w-7 h-7 mb-4" style={{ color: panel.accent }} />
                                <h3 className="text-white text-lg font-medium mb-2">{panel.name}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{panel.description}</p>
                            </motion.div>
                        )
                    })}
                </div>

                <div className="mb-10">
                    <p className="text-white/50 uppercase tracking-[0.2em] text-xs mb-4 font-medium">
                        Variants Explorer Preview
                    </p>
                    <div className="space-y-3">
                        {SAMPLE_VARIANTS.map((v) => (
                            <div key={v.gene} className={`rounded-xl border p-5 ${STATE_STYLES[v.state]}`}>
                                <div className="flex items-baseline justify-between mb-2">
                                    <p className="text-white text-base font-medium">{v.gene}</p>
                                    <p className="text-white/50 text-[10px] uppercase tracking-wider">{STATE_LABEL[v.state]}</p>
                                </div>
                                <p className="text-white/60 text-xs mb-2 font-mono">{v.variant}</p>
                                <p className="text-white/70 text-sm leading-relaxed">{v.implication}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <Link
                        href="/shop?category=methylation"
                        className="inline-flex items-center justify-center rounded-full bg-[#B75E18] px-8 py-4 text-base font-semibold text-white transition-all duration-300 active:bg-[#B75E18]/90"
                    >
                        Order GeneX360
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-5 h-5" />
                    </Link>
                    <Link
                        href="/genetics/upload"
                        className="text-white/70 text-sm hover:text-white transition-colors inline-flex items-center justify-center"
                    >
                        Already tested elsewhere? Upload your raw data
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-4 h-4" />
                    </Link>
                </div>
            </div>
        </SectionAnchor>
    )
}
