'use client'
import { ReactNode } from 'react'

interface StickyHeroWrapperProps {
    children: ReactNode
}

export function StickyHeroWrapper({ children }: StickyHeroWrapperProps) {
    return (
        <div className="sticky top-0 left-0 w-full h-screen z-0 overflow-hidden">
            {children}
            {/* Gradient overlay: above video, below scroll sections.
                Provides the uniform readability floor across the entire scroll narrative.
                z-[1] keeps it above the video (z-0 implicit) and below scroll sections (z-10). */}
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none z-[1] bg-gradient-to-b from-black/20 via-black/30 to-black/40"
            />
        </div>
    )
}
