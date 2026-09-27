/**
 * Vitest stand-in for next/font/google. The real module is empty under node
 * (Next swaps the call at build time). Returning a fixed shape keeps shop
 * render tests from crashing. No colour literals.
 */

interface PlayfairDisplayOptions {
    subsets?: readonly string[]
    weight?: string | readonly string[]
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
    variable?: string
    fallback?: readonly string[]
    adjustFontFallback?: boolean
    preload?: boolean
    style?: string | readonly string[]
}

interface PlayfairDisplayResult {
    className: string
    variable: string
    style: { fontFamily: string }
}

export function Playfair_Display(opts?: PlayfairDisplayOptions): PlayfairDisplayResult {
    void opts
    return {
        className: 'cs-font',
        variable: 'cs-font-var',
        style: { fontFamily: 'Playfair Display' },
    }
}
