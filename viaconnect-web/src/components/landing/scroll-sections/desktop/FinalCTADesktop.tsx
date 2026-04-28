'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'

export function FinalCTADesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.finalCta}
            ariaLabel="Start Today"
            className="min-h-screen py-32 px-12 bg-[#1A2744] flex items-center"
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl mx-auto text-center"
            >
                <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-sm mb-4 font-medium">
                    Start Today
                </p>
                <h2 className="text-white text-7xl font-light leading-tight mb-8">
                    Your protocol is waiting.
                </h2>
                <p className="text-white/70 text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
                    Take the assessment. Get your personalized protocol within minutes. Add genetics or labs anytime to deepen your protocol.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center rounded-full bg-[#B75E18] px-10 py-5 text-base font-semibold text-white transition-all duration-300 hover:bg-[#B75E18]/90 hover:shadow-[0_0_40px_rgba(183,94,24,0.5)]"
                    >
                        Start Your Assessment
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-5 h-5" />
                    </Link>
                    <Link
                        href="/practitioner"
                        className="text-white/70 text-base hover:text-white transition-colors inline-flex items-center"
                    >
                        I am a practitioner
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-4 h-4" />
                    </Link>
                </div>
                <p className="text-white/50 text-sm">
                    No subscription required. HIPAA-aware. Your data, your control.
                </p>
            </motion.div>
        </SectionAnchor>
    )
}
