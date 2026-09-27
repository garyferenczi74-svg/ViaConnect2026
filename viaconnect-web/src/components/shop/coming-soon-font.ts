import localFont from 'next/font/local'

/**
 * Playfair Display 600, Latin subset, for the coming soon overlay only.
 * The woff2 and OFL.txt sit beside this module. The CSS variable matches
 * the family slot in coming-soon-metal.css. Reversible: swap this call
 * back to next/font/google with the same variable name.
 * Fallback stack is Georgia, then Times New Roman, then the generic serif.
 */
export const comingSoonSerif = localFont({
    src: './fonts/playfair-display-latin-600.woff2',
    weight: '600',
    style: 'normal',
    display: 'swap',
    variable: '--font-coming-soon',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
    adjustFontFallback: 'Times New Roman',
})
