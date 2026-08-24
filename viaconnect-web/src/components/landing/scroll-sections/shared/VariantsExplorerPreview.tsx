import { FlaskConical } from 'lucide-react'
import { protocolChangeLine } from '@/lib/genetics/protocolChangeLine'
import type { ProtocolDelta } from '@/lib/genetics/protocolChangeLine'
import {
    PREVIEW_STATE_LABEL,
    PREVIEW_STATE_STYLES,
    PREVIEW_VARIANTS,
    VARIANTS_EXPLORER_EDUCATIONAL_LINE,
    VARIANTS_EXPLORER_PREVIEW_TITLE,
    type PreviewVariantState,
} from './variantsExplorerPreview'

interface VariantsExplorerPreviewProps {
    density: 'compact' | 'comfortable'
    /** Marketing has no member protocol. Only pass a real in-app delta. */
    protocolDelta?: ProtocolDelta | null
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

export function VariantsExplorerPreview({
    density,
    protocolDelta = null,
}: VariantsExplorerPreviewProps) {
    const changeLine = protocolChangeLine(protocolDelta)
    const cardPad = density === 'comfortable' ? 'p-6' : 'p-5'
    const geneSize = density === 'comfortable' ? 'text-lg' : 'text-base'
    const grid =
        density === 'comfortable'
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-4'
            : 'space-y-3'

    return (
        <div>
            <p className="text-white/50 uppercase tracking-[0.2em] text-xs mb-4 font-medium md:mb-6">
                {VARIANTS_EXPLORER_PREVIEW_TITLE}
            </p>
            <div className={grid}>
                {PREVIEW_VARIANTS.map((v) => (
                    <div key={v.gene} className={`rounded-xl border ${cardPad} ${PREVIEW_STATE_STYLES[v.state]}`}>
                        <div className="flex items-baseline justify-between mb-2 md:mb-3">
                            <p className={`text-white font-medium ${geneSize}`}>{v.gene}</p>
                            <StateBadge state={v.state} />
                        </div>
                        <p className="text-white/60 text-xs mb-2 font-mono md:mb-3">{v.variant}</p>
                        <p className="text-white/70 text-sm leading-relaxed">{v.implication}</p>
                    </div>
                ))}
            </div>
            {changeLine ? (
                <p className="mt-4 text-[12px] leading-relaxed text-white/55 md:text-[13px]">
                    {changeLine}
                </p>
            ) : null}
            <p className="mt-4 text-[12px] leading-relaxed text-white/45 md:text-[13px]">
                {VARIANTS_EXPLORER_EDUCATIONAL_LINE}
            </p>
        </div>
    )
}
