/**
 * Brief 72: Description and Formulation reuse the shared Open pill classes.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductInfoButtons } from '@/components/shop/ProductInfoButtons'
import { CONSUMER_OPEN_PILL_BASE, CONSUMER_OPEN_PILL_LINK } from '@/lib/ui/consumerChrome'

const source = readFileSync(join(process.cwd(), 'src/components/shop/ProductInfoButtons.tsx'), 'utf8')

describe('ProductInfoButtons open pill', () => {
    it('reuses CONSUMER_OPEN_PILL_BASE and the link hover treatment', () => {
        expect(source).toContain('CONSUMER_OPEN_PILL_BASE')
        expect(source).toContain('CONSUMER_OPEN_PILL_LINK')
        expect(source).toContain("from '@/lib/ui/consumerChrome'")
        expect(source).toContain('stopPropagation')
        expect(source).toContain('strokeWidth={1.5}')
        expect(source).toContain('ChevronRight')
        expect(source).not.toContain('ChevronDown')
        expect(source).not.toContain('bg-[rgba(45,165,160,0.20)]')
        expect(source).not.toContain('bg-[rgba(183,94,24,0.18)]')
        expect(source).toContain('border-[#5B8DEF]/70')
        expect(source).toContain('bg-[#2A4C9E]/30')
        expect(source).toContain('motion-reduce:transition-none')
        expect(source).toContain('flex flex-wrap gap-2')

        const html = renderToStaticMarkup(
            createElement(ProductInfoButtons, {
                description: 'A calm description.',
                formulationJson: [{ ingredient: 'Magnesium', mg: 100 }],
                deliveryForm: 'Capsule',
            }),
        )
        expect(html).toContain('Description')
        expect(html).toContain('Formulation')
        expect(html).not.toContain('text-xs font-medium')
        for (const token of CONSUMER_OPEN_PILL_BASE.split(/\s+/)) {
            expect(html, token).toContain(token)
        }
        for (const token of ['hover:border-[#5B8DEF]/55', 'hover:bg-[#2A4C9E]/20', 'focus-visible:ring-[#2DA5A0]/70']) {
            expect(html, token).toContain(token)
        }
        expect(html).toContain('h-3.5')
        expect(html).toContain('text-white/80')
        expect(html).toContain('stroke-width="1.5"')
        expect(CONSUMER_OPEN_PILL_LINK.startsWith(CONSUMER_OPEN_PILL_BASE)).toBe(true)
    })
})
