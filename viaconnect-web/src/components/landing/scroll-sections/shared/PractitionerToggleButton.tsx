'use client'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface PractitionerToggleButtonProps {
    id: string
    ariaControls: string
    isOpen: boolean
    onToggle: () => void
}

// Practitioner & Naturopath pricing toggle.
// Brand teal accent (matches the rest of the landing page glass-button family).
// ChevronDown rotates 180 degrees on open via Framer Motion (respects
// prefers-reduced-motion automatically).
// id and ariaControls passed in from parent so duplicate ids don't collide
// when PricingTierGrid renders inside both desktop + mobile scroll trees.
export function PractitionerToggleButton({ id, ariaControls, isOpen, onToggle }: PractitionerToggleButtonProps) {
    return (
        <button
            id={id}
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={ariaControls}
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 text-white text-base font-medium tracking-wide shadow-[0_0_20px_rgba(45,165,160,0.4)] transition-all duration-200 hover:bg-[#2DA5A0]/50 hover:border-[#2DA5A0]/60 hover:shadow-[0_0_30px_rgba(45,165,160,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent w-full max-w-sm sm:w-auto"
        >
            <span>Practitioner &amp; Naturopath Pricing</span>
            <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex"
                aria-hidden="true"
            >
                <ChevronDown className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            </motion.span>
        </button>
    )
}
