/**
 * SectionHeading renders a Lucide icon plus h2 title pair used to anchor
 * each major content section on the product detail page per Prompt #148
 * §I. Icon sits at h-5 w-5 in brand teal #2DA5A0 with aria-hidden true
 * since it is decorative reinforcement of the heading text.
 */
import type { LucideIcon } from 'lucide-react'

interface SectionHeadingProps {
    icon: LucideIcon
    children: React.ReactNode
    className?: string
}

export function SectionHeading({ icon: Icon, children, className }: SectionHeadingProps) {
    return (
        <h2
            className={`mb-3 flex items-center gap-2 text-lg font-semibold text-white ${
                className ?? ''
            }`}
        >
            <Icon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
            {children}
        </h2>
    )
}
