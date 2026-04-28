'use client'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// Mobile-only animated scroll cue. Sits absolutely at the bottom of the
// hero engagement zone with pointer-events-none so it never blocks taps.
// Framer Motion gentle bounce respects prefers-reduced-motion automatically.
export function HeroScrollCue() {
    return (
        <div className="block lg:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-[5] pointer-events-none">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{
                    opacity: [0.6, 1, 0.6],
                    y: [0, 8, 0],
                }}
                transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className="flex flex-col items-center gap-2 text-white/80"
            >
                <span className="text-xs uppercase tracking-[0.2em] font-medium">
                    Scroll to explore
                </span>
                <ChevronDown className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </motion.div>
        </div>
    )
}
