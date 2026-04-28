'use client'
import { ReactNode } from 'react'

interface SectionAnchorProps {
    id: string
    ariaLabel: string
    children: ReactNode
    className?: string
}

export function SectionAnchor({ id, ariaLabel, children, className = '' }: SectionAnchorProps) {
    return (
        <section
            id={id}
            aria-label={ariaLabel}
            className={`relative scroll-mt-20 ${className}`}
        >
            {children}
        </section>
    )
}
