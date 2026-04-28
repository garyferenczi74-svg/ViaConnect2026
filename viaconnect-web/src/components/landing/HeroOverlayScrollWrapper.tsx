'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ReactNode } from 'react'

interface HeroOverlayScrollWrapperProps {
    children: ReactNode
}

export function HeroOverlayScrollWrapper({ children }: HeroOverlayScrollWrapperProps) {
    const { scrollY } = useScroll()
    const opacity = useTransform(scrollY, [0, 400], [1, 0])
    const y = useTransform(scrollY, [0, 400], [0, -120])

    return (
        <motion.div style={{ opacity, y }} className="relative z-10">
            {children}
        </motion.div>
    )
}
