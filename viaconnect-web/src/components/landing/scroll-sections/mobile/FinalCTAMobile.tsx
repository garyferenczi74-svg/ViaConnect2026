'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'

export function FinalCTAMobile() {
    return (
        <SectionAnchor
            id={SECTION_IDS.finalCta}
            ariaLabel="Start Today"
            className="min-h-screen py-20 px-5 bg-[rgba(13,18,37,0.92)] backdrop-blur-xl flex items-center"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="max-w-md mx-auto text-center"
            >
                <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                    Start Today
                </p>
                <h2 className="text-white text-5xl font-light leading-tight mb-6">
                    Your protocol is waiting.
                </h2>
                <p className="text-white/70 text-base leading-relaxed mb-10">
                    Take the assessment. Get your personalized protocol within minutes. Add genetics or labs anytime to deepen your protocol.
                </p>
                <div className="flex flex-col items-stretch gap-4 mb-8">
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center rounded-full bg-[#B75E18] px-8 py-4 text-base font-semibold text-white transition-all duration-300 active:bg-[#B75E18]/90"
                    >
                        Start Your Assessment
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-5 h-5" />
                    </Link>
                    <Link
                        href="/practitioner"
                        className="text-white/70 text-base hover:text-white transition-colors inline-flex items-center justify-center"
                    >
                        I am a practitioner
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-4 h-4" />
                    </Link>
                </div>
                <p className="text-white/50 text-xs">
                    No subscription required. HIPAA-aware. Your data, your control.
                </p>
            </motion.div>
        </SectionAnchor>
    )
}
