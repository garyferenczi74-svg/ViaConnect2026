/**
 * Cart line badge. Not catalog data.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CartLineUnavailableBadge } from '@/components/shop/CartLineUnavailableBadge'
import { CART_LINE_UNAVAILABLE_BADGE } from '@/lib/shop/coming-soon-copy'

describe('CartLineUnavailableBadge', () => {
    it('renders the approved badge string in the existing rose alert tone', () => {
        const html = renderToStaticMarkup(<CartLineUnavailableBadge />)
        expect(html).toContain(CART_LINE_UNAVAILABLE_BADGE)
        expect(html).toContain('border-rose-500/30')
        expect(html).toContain('bg-rose-500/10')
        const drawer = readFileSync(join(process.cwd(), 'src/components/shop/CartChrome.tsx'), 'utf8')
        expect(drawer).toContain('useUnavailableCartSkus')
        expect(drawer).toContain('CartLineUnavailableBadge')
        const page = readFileSync(join(process.cwd(), 'src/components/shop/CartPageView.tsx'), 'utf8')
        expect(page).toContain('CartLineUnavailableBadge')
    })
})
