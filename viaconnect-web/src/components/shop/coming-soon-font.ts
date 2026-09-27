import { Playfair_Display } from 'next/font/google'

/**
 * Playfair Display 600 for the coming soon overlay only.
 * next/font self-hosts the woff2 on routes that import the overlay.
 * Fallback stack is Georgia, then Times New Roman, then the generic serif.
 */
export const comingSoonSerif = Playfair_Display({
    subsets: ['latin'],
    weight: '600',
    display: 'swap',
    variable: '--font-coming-soon',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
})
