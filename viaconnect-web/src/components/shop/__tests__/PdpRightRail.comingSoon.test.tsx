/**
 * PDP purchase controls. Fixtures are not catalog data.
 */
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PdpRightRail } from '@/components/shop/PdpRightRail'
import type { ShopProduct } from '@/lib/shop/queries'

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children?: ReactNode }) =>
        createElement('a', { href }, children),
}))

vi.mock('next/navigation', () => ({
    usePathname: () => '/shop/product/creatine-fixture',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

function product(partial: Partial<ShopProduct> = {}): ShopProduct {
    return {
        id: 'id-1',
        sku: 'FC-CREATINE-001',
        slug: 'creatine-fixture',
        name: 'Creatine Fixture',
        short_name: 'Creatine',
        summary: 'Not catalog data',
        description: '',
        format: 'powder',
        category: 'supplement',
        category_slug: 'advanced-formulas',
        price: 20,
        price_msrp: 24,
        pricing_tier: 'L1',
        image_url: null,
        image_urls: null,
        status_tags: null,
        testing_meta: null,
        snp_targets: null,
        bioavailability_pct: null,
        product_type: 'supplement',
        ingredients: null,
        gene_match_score: null,
        requires_practitioner_order: false,
        active: true,
        display_config: null,
        is_released: false,
        ...partial,
    }
}

function renderRail(item: ShopProduct, variant: 'supplement' | 'testing') {
    return renderToStaticMarkup(
        <PdpRightRail
            product={item}
            variant={variant}
            waitlist={{ signedIn: true, joined: false }}
        />,
    )
}

describe('PdpRightRail coming soon', () => {
    it('hides quantity, bundle, and add to cart on an unreleased supplement', () => {
        const html = renderRail(product({ is_released: false }), 'supplement')
        expect(html).not.toContain('Decrease quantity')
        expect(html).not.toContain('Add to Bundle')
        expect(html).not.toContain('Add to Cart')
        expect(html).toContain('Join the Revolution')
        expect(html).toContain('lg:max-w-[420px]')
    })

    it('leaves a released supplement buyable', () => {
        const html = renderRail(product({ name: 'Released Fixture', is_released: true }), 'supplement')
        expect(html).toContain('Decrease quantity')
        expect(html).toContain('Add to Bundle')
        expect(html).toContain('Add to Cart')
        expect(html).toContain('Join the Revolution')
    })

    it('leaves a kit buyable', () => {
        const html = renderRail(
            product({
                name: 'Panel Kit',
                category: 'test_kit',
                product_type: 'test_kit',
                category_slug: 'genex360',
                is_released: true,
                requires_practitioner_order: true,
            }),
            'testing',
        )
        expect(html).toContain('Order Test Kit')
        expect(html).toContain('Join the Revolution')
        expect(html).not.toContain('Add to Bundle')
    })
})
