/**
 * Coming soon overlay. Not catalog data.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComingSoonOverlay } from '@/components/shop/ComingSoonOverlay'
import { COMING_SOON_OVERLAY_TEXT } from '@/lib/shop/coming-soon-copy'

describe('ComingSoonOverlay', () => {
    it('hides the visual layer and exposes the same words to assistive tech', () => {
        const html = renderToStaticMarkup(<ComingSoonOverlay tone="onLight" size="card" />)
        expect(html).toContain('aria-hidden="true"')
        expect(html).toContain('class="sr-only"')
        expect(html).toContain(COMING_SOON_OVERLAY_TEXT)
        const dark = renderToStaticMarkup(<ComingSoonOverlay tone="onDark" size="pdp" />)
        expect(dark).toContain('text-white/50')
        expect(dark).toContain('text-3xl')
    })

    it('uses no hex other than the navy token', () => {
        const source = readFileSync(
            join(process.cwd(), 'src/components/shop/ComingSoonOverlay.tsx'),
            'utf8',
        )
        const hexes = source.match(/#[0-9A-Fa-f]{3,8}/g) ?? []
        expect(hexes.length).toBeGreaterThan(0)
        expect(hexes.every((hex) => hex.toLowerCase() === '#1a2744')).toBe(true)
    })
})
