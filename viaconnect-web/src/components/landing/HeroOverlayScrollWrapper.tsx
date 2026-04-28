'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'

interface HeroOverlayScrollWrapperProps {
    children: ReactNode
}

export function HeroOverlayScrollWrapper({ children }: HeroOverlayScrollWrapperProps) {
    const { scrollY } = useScroll()

    // Desktop fades over 0-400px scroll (original spec). Mobile uses a wider
    // 0-1500px range so the hero CTAs stay readable + tappable through the
    // sticky-cover transition. SSR-safe: state defaults to desktop range and
    // syncs to the viewport on mount + resize.
    const [fadeMax, setFadeMax] = useState(400)
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 639px)')
        const update = () => setFadeMax(mql.matches ? 1500 : 400)
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
