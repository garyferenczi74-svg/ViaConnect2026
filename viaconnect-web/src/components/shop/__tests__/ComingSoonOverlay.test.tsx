/**
 * Coming soon overlay. Not catalog data.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComingSoonOverlay } from '@/components/shop/ComingSoonOverlay'
import { comingSoonSerif } from '@/components/shop/coming-soon-font'
import { COMING_SOON_OVERLAY_TEXT } from '@/lib/shop/coming-soon-copy'

const STAGGER_SECONDS = [0, -1.421, -0.543, -1.964, -1.086, -0.207, -1.628, -0.75]

function rootTag(html: string): string {
    const match = html.match(/<div\b[^>]*data-testid="coming-soon-overlay"[^>]*>/)
    if (!match) throw new Error('overlay root missing')
    return match[0]
}

function accessibleText(html: string): string {
    const stripped = html.replace(/<div\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/div>/, '')
    return stripped.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

describe('ComingSoonOverlay', () => {
    it('hides the visual layer and keeps one sr-only Coming soon twin', () => {
        const html = renderToStaticMarkup(<ComingSoonOverlay tone="onLight" size="card" />)
        const root = rootTag(html)
        expect(root).toContain('aria-hidden="true"')
        expect(root).toContain('data-size="card"')
        expect(root).toContain('data-tone="onLight"')
        expect(root).toContain('data-cs-paused="true"')
        expect(root).toContain('cs-metal')
        expect(root).toContain(comingSoonSerif.variable)
        expect(root).not.toMatch(/\bbg-/)
        expect(root).not.toMatch(/\bbackdrop-/)
        expect(root).not.toMatch(/\bopacity-/)
        expect(root).not.toMatch(/\bmix-blend-/)
        expect(html).toContain('class="cs-intro"')
        expect(html).toContain('class="cs-stage"')
        expect(html).toContain('class="cs-bob"')
        expect(html).toContain('class="cs-word"')
        expect(html).toContain('class="cs-layer cs-edge"')
        expect(html).toContain('class="cs-layer cs-deep"')
        expect(html).toContain('class="cs-layer cs-hi"')
        expect(html.match(/class="cs-line"/g)?.length).toBe(6)
        expect(html.match(/class="cs-refl"/g)?.length).toBe(1)
        expect(html).toContain('>Coming<')
        expect(html).toContain('>soon<')
        expect(html.match(/class="sr-only"/g)?.length).toBe(1)
        expect(accessibleText(html)).toBe(COMING_SOON_OVERLAY_TEXT)

        const pdp = renderToStaticMarkup(<ComingSoonOverlay tone="onDark" size="pdp" staggerIndex={3} />)
        expect(rootTag(pdp)).toContain('data-size="pdp"')
        expect(rootTag(pdp)).toContain('data-tone="onDark"')
        expect(rootTag(pdp)).toContain('data-cs-paused="true"')
        expect(accessibleText(pdp)).toBe(COMING_SOON_OVERLAY_TEXT)
    })

    it('sets golden-ratio delays for staggerIndex 0 through 7', () => {
        STAGGER_SECONDS.forEach((seconds, index) => {
            const html = renderToStaticMarkup(
                <ComingSoonOverlay tone="onLight" size="card" staggerIndex={index} />,
            )
            expect(html).toContain(`--cs-delay:${seconds}s`)
            expect(html).toContain(`--cs-intro-delay:${(index % 8) * 0.04}s`)
        })
    })
})
