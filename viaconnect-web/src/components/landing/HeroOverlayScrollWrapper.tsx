'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'

interface HeroOverlayScrollWrapperProps {
    children: ReactNode
}

export function HeroOverlayScrollWrapper({ children }: HeroOverlayScrollWrapperProps) {
    const { scrollY } = useScroll()

    // Desktop fades over 0-400px scroll (original spec). Mobile uses 0-900px
    // so hero text fully clears before Features section enters viewport
    // (~scroll 1000px on mobile after 100vh hero + 280px spacer when
    // TrustBand/Sarah/Outcome render null). Earlier 1500px was too wide and
    // hero text bled into Features section. SSR-safe: state defaults to
    // desktop range and syncs to the viewport on mount + resize.
    const [fadeMax, setFadeMax] = useState(400)
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 639px)')
        const update = () => setFadeMax(mql.matches ? 900 : 400)
        update()
        mql.addEventListener('change', update)
        return () => mql.removeEventListener('change', update)
    }, [])

    const opacity = useTransform(scrollY, [0, fadeMax], [1, 0])
    const y = useTransform(scrollY, [0, fadeMax], [0, -120])

    return (
        <motion.div style={{ opacity, y }} className="relative z-10">
            {children}
        </motion.div>
    )
}
