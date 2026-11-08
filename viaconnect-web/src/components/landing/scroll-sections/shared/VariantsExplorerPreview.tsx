'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { protocolChangeLine } from '@/lib/genetics/protocolChangeLine'
import type { ProtocolDelta } from '@/lib/genetics/protocolChangeLine'
import { cn } from '@/lib/utils'
import {
    PREVIEW_STATE_LABEL,
    PREVIEW_STATE_STYLES,
    PREVIEW_VARIANTS,
    VARIANTS_EXPLORER_EDUCATIONAL_LINE,
    VARIANTS_EXPLORER_PREVIEW_TITLE,
    type PreviewVariant,
    type PreviewVariantState,
} from './variantsExplorerPreview'

interface VariantsExplorerPreviewProps {
    density: 'compact' | 'comfortable'
    /** Marketing has no member protocol. Only pass a real in-app delta. */
    protocolDelta?: ProtocolDelta | null
}

function finePointer(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function DemoBadge() {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70"
            title="Demo preview, not your genotype"
        >
            <FlaskConical aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            Demo
        </span>
    )
}

function StateBadge({ state }: { state: PreviewVariantState }) {
    if (state === 'demo') return <DemoBadge />
    return (
        <p className="text-white/50 text-[10px] uppercase tracking-wider md:text-xs">
            {PREVIEW_STATE_LABEL[state]}
        </p>
    )
}

function ExplorerCard({ variant, geneSize }: { variant: PreviewVariant; geneSize: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div
            data-testid={`explorer-card-${variant.gene}`}
            tabIndex={0}
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
            className={cn(
                'rounded-xl border p-3 text-left outline-none transition-colors md:p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]',
                PREVIEW_STATE_STYLES[variant.state],
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={cn('text-white font-medium', geneSize)}>{variant.gene}</p>
                    <p className="text-white/60 text-xs font-mono mt-1">{variant.variant}</p>
                </div>
                <StateBadge state={variant.state} />
            </div>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <p className="min-h-0 overflow-hidden text-white/70 text-sm leading-relaxed">
                    <span className={cn('block', open ? 'pt-3' : 'pt-0')}>{variant.implication}</span>
                </p>
            </div>
        </div>
    )
}

export function VariantsExplorerPreview({
    density,
    protocolDelta = null,
}: VariantsExplorerPreviewProps) {
    const changeLine = protocolChangeLine(protocolDelta)
    const geneSize = density === 'comfortable' ? 'text-base' : 'text-sm'
    const grid =
        density === 'comfortable'
            ? 'grid grid-cols-1 min-[1000px]:grid-cols-3 gap-3'
            : 'space-y-3'

    return (
        <div data-testid="variants-explorer-preview">
            <p className="text-white/50 uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                {VARIANTS_EXPLORER_PREVIEW_TITLE}
            </p>
            <div className={grid}>
                {PREVIEW_VARIANTS.map((variant) => (
                    <ExplorerCard key={variant.gene} variant={variant} geneSize={geneSize} />
                ))}
            </div>
            {changeLine ? <p className="sr-only">{changeLine}</p> : null}
            <p className="sr-only">{VARIANTS_EXPLORER_EDUCATIONAL_LINE}</p>
        </div>
    )
}
