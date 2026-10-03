import { cn } from '@/lib/utils'
import { CONSUMER_OPEN_PILL_BASE, CONSUMER_OPEN_PILL_LINK } from '@/lib/ui/consumerChrome'

/**
 * Equal-width Open pills. basis is half the row minus the 8px gap.
 * min-width stays at content size, so a label that would truncate wraps
 * onto its own full-width row instead.
 */
export const CARD_PILL_LAYOUT =
    'w-full max-w-full flex-1 basis-[calc(50%-4px)] justify-center gap-1.5 whitespace-nowrap'

/** One blue active treatment. Fill 30%, border 70%. */
export const ACTIVE_PILL =
    'border-[#5B8DEF]/70 bg-[#2A4C9E]/30 text-white transition-all duration-200 hover:border-[#5B8DEF]/70 hover:bg-[#2A4C9E]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none'

export const PANEL_GLASS = 'rounded-xl border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-2.5'

export const OPEN_PANEL = `${PANEL_GLASS} mt-2 w-full basis-full`

export function openPillClass(active: boolean): string {
    return cn(
        active ? CONSUMER_OPEN_PILL_BASE : CONSUMER_OPEN_PILL_LINK,
        CARD_PILL_LAYOUT,
        active && ACTIVE_PILL,
    )
}

export function emptyPillClass(): string {
    return cn(
        CONSUMER_OPEN_PILL_BASE,
        'w-full max-w-full basis-full cursor-not-allowed justify-center text-center text-white/60',
    )
}

export const CHEVRON_SLOT =
    'inline-flex shrink-0 transition-transform duration-200 motion-reduce:transition-none'
