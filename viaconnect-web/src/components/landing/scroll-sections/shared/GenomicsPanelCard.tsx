'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function finePointer(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function GenomicsPanelCard({
    icon: Icon,
    name,
    accent,
    description,
}: {
    icon: LucideIcon
    name: string
    accent: string
    description: string
}) {
    const [open, setOpen] = useState(false)

    return (
        <button
            type="button"
            data-testid={`genomics-panel-${name}`}
            aria-expanded={open}
            onMouseEnter={() => {
                if (finePointer()) setOpen(true)
            }}
            onMouseLeave={() => {
                if (finePointer()) setOpen(false)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={() => {
                if (!finePointer()) setOpen((current) => !current)
            }}
            className="genomics-panel flex h-full w-full flex-col items-start bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
            style={{ borderTopColor: accent, borderTopWidth: '2px' }}
        >
            <Icon strokeWidth={1.5} className="genomics-panel-icon w-8 h-8 mb-6 shrink-0" style={{ color: accent }} />
            <h3 className="genomics-panel-name text-white text-2xl font-medium mb-3">{name}</h3>
            <div
                data-open={open ? 'true' : 'false'}
                className={cn(
                    'grid min-h-0 w-full flex-1 overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <p className="genomics-panel-body min-h-0 overflow-auto text-white/60 text-sm leading-relaxed">{description}</p>
            </div>
        </button>
    )
}
