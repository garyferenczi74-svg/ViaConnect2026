import { COMING_SOON_OVERLAY_TEXT } from '@/lib/shop/coming-soon-copy'

interface ComingSoonOverlayProps {
    tone: 'onLight' | 'onDark'
    size: 'card' | 'pdp'
}

/**
 * See-through "Coming soon" across a product image.
 * The visual layer is hidden from assistive tech. A separate sr-only twin
 * carries the same words. Sits under status pills (z-10).
 */
export function ComingSoonOverlay({ tone, size }: ComingSoonOverlayProps) {
    const color = tone === 'onLight' ? 'text-[#1A2744]/40' : 'text-white/50'
    const scale = size === 'card' ? 'text-lg sm:text-2xl xl:text-3xl' : 'text-3xl md:text-5xl'

    return (
        <>
            <div
                aria-hidden="true"
                data-testid="coming-soon-overlay"
                className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden"
            >
                <span
                    className={`-rotate-[25deg] whitespace-nowrap select-none font-semibold uppercase tracking-[0.18em] ${color} ${scale}`}
                >
                    {COMING_SOON_OVERLAY_TEXT}
                </span>
            </div>
            <span className="sr-only">{COMING_SOON_OVERLAY_TEXT}</span>
        </>
    )
}
