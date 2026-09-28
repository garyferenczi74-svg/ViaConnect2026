/**
 * Vitest stand-in for next/font/local. The real module is empty under node
 * (Next swaps the call at build time). Returning a fixed shape keeps shop
 * render tests from crashing. No colour literals.
 */

interface LocalFontOptions {
    src?: string | ReadonlyArray<{ path: string; weight?: string; style?: string }>
    weight?: string
    style?: string
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
    variable?: string
    fallback?: readonly string[]
    adjustFontFallback?: false | 'Arial' | 'Times New Roman'
    preload?: boolean
}

interface LocalFontResult {
    className: string
    variable: string
    style: { fontFamily: string }
}

export default function localFont(options?: LocalFontOptions): LocalFontResult {
    return {
        className: 'cs-font',
        variable: options?.variable ?? 'cs-font-var',
        style: { fontFamily: 'Playfair Display' },
    }
}
