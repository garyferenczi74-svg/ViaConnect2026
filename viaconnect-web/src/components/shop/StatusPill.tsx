/**
 * StatusPill renders the optional pill in the top-right of a product card
 * image per Prompt #141 v3 §4.2 (supplement) and §4.3 (testing). Source data:
 * products.status_tags JSONB array, plus the conditional GENE MATCH pill
 * that the card layer injects when the user has CAQ on file AND the product
 * has gene_match_score >= 0.75 (spec §10).
 *
 * GENE MATCH is the only kind that gets the special teal treatment per spec
 * §4.2; every other kind shares the default glassmorphic chip styling.
 */

export const KNOWN_STATUS_PILL_KINDS = [
    'GENE MATCH',
    'NEW',
    'BUNDLE',
    'TIER 3',
    'RX REQUIRED',
    'LIPOSOMAL',
    'LIMITED',
    'LAB DRAW REQUIRED',
    'AT-HOME COLLECTION',
] as const

export type StatusPillKind = (typeof KNOWN_STATUS_PILL_KINDS)[number]

interface StatusPillProps {
    kind: string
    className?: string
}

export function StatusPill({ kind, className }: StatusPillProps) {
    const isGeneMatch = kind === 'GENE MATCH'
    const base =
        'text-[11px] uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md'
    const variant = isGeneMatch
        ? 'border border-[#2DA5A0] text-[#2DA5A0] bg-[#2DA5A0]/10'
        : 'border border-white/15 text-white/80 bg-white/10'
    return <span className={`${base} ${variant}${className ? ' ' + className : ''}`}>{kind}</span>
}
