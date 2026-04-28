'use client'
import { ReactNode } from 'react'

interface StickyHeroWrapperProps {
    children: ReactNode
}

export function StickyHeroWrapper({ children }: StickyHeroWrapperProps) {
    return (
        <div className="sticky top-0 left-0 w-full h-screen z-0 overflow-hidden">
            {children}
        </div>
    )
}
