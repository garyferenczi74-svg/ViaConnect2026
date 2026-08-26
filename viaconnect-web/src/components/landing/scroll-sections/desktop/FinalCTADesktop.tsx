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
            className="py-16 px-5 md:py-20 md:px-12"
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl mx-auto text-center"
            >
                <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs md:text-sm mb-3 md:mb-4 font-medium">
                    Start Today
                </p>
                <h2 className="text-white text-5xl md:text-7xl font-light leading-tight mb-6 md:mb-8">
                    Your protocol is waiting
                </h2>
                <p className="text-white/70 text-base md:text-xl leading-relaxed mb-10 md:mb-12 max-w-2xl mx-auto">
                    Take the assessment. Get your personalized protocol within minutes. Add genetics or labs anytime to deepen your protocol.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 md:gap-6 mb-8 md:mb-10">
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center rounded-full bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 px-10 py-5 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60 hover:shadow-[0_0_40px_rgba(183,94,24,0.5)]"
                    >
                        Your Journey Starts Here
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-5 h-5" />
                    </Link>
                    <Link
                        href="/practitioners"
                        className="inline-flex items-center justify-center rounded-full bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 px-10 py-5 text-base font-semibold text-white shadow-[0_0_20px_rgba(45,165,160,0.4)] transition-all duration-300 hover:bg-[#2DA5A0]/50 hover:border-[#2DA5A0]/60 hover:shadow-[0_0_40px_rgba(45,165,160,0.5)]"
                    >
                        I am a Practitioner or Naturopath
                        <ArrowRight strokeWidth={1.5} className="ml-2 w-5 h-5" />
                    </Link>
                </div>
                <p className="text-white/50 text-sm">
                    No subscription required. HIPAA-aware. Your data, your control.
                </p>
            </motion.div>
        </SectionAnchor>
    )
}
